// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseService } from "@/lib/supabaseService";

// Initialize Stripe with a fallback for build-time safety
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_dummy_build_key", {
  apiVersion: "2023-10-16" as any,
});

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
      
      // 1. USER JUST PAID FOR THE FIRST TIME
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const customerId = session.customer as string;
        const planType = session.metadata?.planType;

        if (userId && customerId) {
          // Use Supabase Service Key to bypass RLS securely
          await supabaseService.from('profiles').update({
            stripe_customer_id: customerId,
            subscription_status: 'active',
            plan_type: planType,
            is_pro: true // <-- ADDED: Explicitly tell the DB they are Pro
          }).eq('id', userId);
        }
        break;
      }

      // 2. USER SUBSCRIPTION CANCELLED OR FAILED PAYMENT
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
          const mappedStatus = status === 'active' ? 'active' : (status === 'canceled' ? 'canceled' : 'past_due');
          await supabaseService.from('profiles').update({
            subscription_status: mappedStatus,
            is_pro: mappedStatus === 'active', // <-- ADDED: Automatically removes Pro if canceled/past due
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          }).eq('id', profile.id);
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