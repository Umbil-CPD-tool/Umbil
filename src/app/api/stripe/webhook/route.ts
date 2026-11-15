import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseService } from "@/lib/supabaseService";
import { sendProWelcomeEmail } from "@/lib/email/proWelcome";
import { recordConversionEvent } from "@/lib/analytics/recordConversionEvent";
import {
  cancelledDuringTrial,
  classifyBillingEvent,
  monthlyRecurringPence,
} from "@/lib/analytics/conversionFunnel";

// Initialize Stripe with a fallback for build-time safety
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_dummy_build_key", {
  apiVersion: "2026-03-25.dahlia" as any, 
});

type RecurringPrice = {
  unit_amount?: number | null;
  recurring?: { interval?: string | null; interval_count?: number | null } | null;
};

const listMrrPence = (subscription: Stripe.Subscription): number => {
  const item = subscription.items?.data?.[0];
  const price = item?.price as RecurringPrice | undefined;
  const discount = (subscription as { discount?: { coupon?: { percent_off?: number | null } | null } | null }).discount;
  const percentOff = discount?.coupon?.percent_off;
  return (
    monthlyRecurringPence({
      unitAmount: price?.unit_amount ?? null,
      interval: price?.recurring?.interval ?? null,
      intervalCount: price?.recurring?.interval_count ?? null,
      quantity: item?.quantity ?? 1,
      percentOff: typeof percentOff === "number" ? percentOff : null,
    }) ?? 0
  );
};

const recordBillingEvent = async (input: {
  event: Stripe.Event;
  userId: string;
  subscription: Stripe.Subscription;
  kind: "trial_started" | "subscribed" | "cancelled";
  duringTrial?: boolean;
}) => {
  const list = listMrrPence(input.subscription);
  await recordConversionEvent({
    userId: input.userId,
    eventType: input.kind,
    surface: "billing",
    source: "stripe",
    planType: input.subscription.metadata?.planType ?? null,
    channel: input.subscription.metadata?.channel ?? null,
    mrrPence: input.kind === "trial_started" || input.duringTrial ? 0 : list,
    listMrrPence: list,
    stripeEventId: input.event.id,
    stripeSubscriptionId: input.subscription.id,
    duringTrial: input.duringTrial ?? false,
  });
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  
  // Moved endpoint secret inside the function to prevent build-time evaluation issues
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!sig || !endpointSecret) throw new Error("Missing Stripe signature or webhook secret");
    // Verify the payload was actually sent by Stripe
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    // Handle the event
    switch (event.type) {
      
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Handle Pro Subscriptions (Both Individual and Team Tiers)
        const userId = session.client_reference_id || session.metadata?.userId;
        const customerId = session.customer as string;
        const planType = session.metadata?.planType;

        if (userId && customerId) {
          // Use Supabase Service Key to bypass RLS securely
          await supabaseService.from('profiles').update({
            stripe_customer_id: customerId,
            subscription_status: 'active',
            plan_type: planType, // e.g., 'pro_monthly', 'team_annual'
            is_pro: true // Explicitly tell the DB they are Pro
          }).eq('id', userId);

          const { data: profile } = await supabaseService
            .from("profiles")
            .select("email, full_name")
            .eq("id", userId)
            .single();

          const to =
            session.customer_details?.email ||
            session.customer_email ||
            profile?.email ||
            null;

          if (to) {
            await sendProWelcomeEmail({
              to,
              name: profile?.full_name,
              planType,
              checkoutSessionId: session.id,
            });
          } else {
            console.error("Pro welcome email skipped: no recipient email for user", userId);
          }

          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
          if (subscriptionId) {
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              const kind = classifyBillingEvent({
                type: "checkout.session.completed",
                status: subscription.status,
              });
              if (kind) {
                await recordBillingEvent({ event, userId, subscription, kind });
              }
            } catch (billingError) {
              console.error(
                "Conversion billing lookup failed:",
                billingError instanceof Error ? billingError.message : billingError
              );
            }
          }
        }
        break;
      }

      // USER SUBSCRIPTION CANCELLED OR FAILED PAYMENT
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status; 

        // Find the user by their Stripe Customer ID
        const { data: profile } = await supabaseService
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          const entitled = status === "active" || status === "trialing";
          await supabaseService.from('profiles').update({
            subscription_status: status,
            is_pro: entitled,
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          }).eq('id', profile.id);

          const previousStatus =
            (event.data.previous_attributes as { status?: string } | undefined)?.status ?? null;
          const kind = classifyBillingEvent({
            type: event.type === "customer.subscription.deleted"
              ? "customer.subscription.deleted"
              : "customer.subscription.updated",
            status,
            previousStatus,
          });
          if (kind) {
            const duringTrial =
              kind === "cancelled" &&
              cancelledDuringTrial({
                previousStatus,
                trialEndUnix: subscription.trial_end,
                canceledAtUnix: subscription.canceled_at,
              });
            await recordBillingEvent({
              event,
              userId: profile.id,
              subscription,
              kind,
              duringTrial,
            });
          }
        }
        break;
      }
    }
    
    return NextResponse.json({ received: true });
    
  } catch (err: any) {
    console.error("Internal Webhook Error:", err);
    return NextResponse.json({ error: "Internal Error handling webhook" }, { status: 500 });
  }
}