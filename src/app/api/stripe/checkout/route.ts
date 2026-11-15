// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { CORS_HEADERS, corsPreflight } from '@/lib/cors';
import { STRIPE_PRICES, isStripePlanType, parseCheckoutChannel } from '@/lib/stripePrices';
import { recordConversionEvent } from '@/lib/analytics/recordConversionEvent';
import { getAppBaseUrl } from '@/lib/security';
import { canPurchaseStudentPlan, clinicianTransitionCoupon, settleComplimentaryAccess } from '@/lib/billing/complimentary';
import { trialPeriodDays } from '@umbil/shared';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia' as any,
});

const checkoutLabel = () => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `umbil_checkout_${suffix}`;
};

export const OPTIONS = corsPreflight;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id, planType, channel: channelRaw } = body;
    const channel = parseCheckoutChannel(channelRaw);

    if (!isStripePlanType(planType)) {
      if (type && id) {
        return NextResponse.json(
          { error: "This report is included with Umbil Pro." },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      return NextResponse.json(
        { error: "Unable to start checkout" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });

    await settleComplimentaryAccess(user.id);

    if (planType === "student_monthly") {
      const allowed = await canPurchaseStudentPlan(user.id);
      if (!allowed) {
        return NextResponse.json(
          { error: "The student plan needs a .ac.uk email on your account." },
          { status: 403, headers: CORS_HEADERS }
        );
      }
    }

    const priceId = STRIPE_PRICES[planType];
    const baseUrl = getAppBaseUrl();
    const coupon = await clinicianTransitionCoupon(user.id, planType);
    const trialDays = coupon ? null : trialPeriodDays(planType);

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // Critical for the webhook to know who bought the subscription
      client_reference_id: user.id,
      integration_identifier: checkoutLabel(),
      metadata: {
        userId: user.id,
        planType: planType,
        ...(channel ? { channel } : {}),
      },
      ...(coupon ? { discounts: [{ coupon }] } : {}),
      subscription_data: {
        ...(trialDays ? { trial_period_days: trialDays } : {}),
        metadata: {
          userId: user.id,
          planType,
          ...(channel ? { channel } : {}),
        },
      },
      success_url: `${baseUrl}/settings?payment=success`,
      cancel_url: `${baseUrl}/pro?payment=cancelled`,
    });

    await recordConversionEvent({
      userId: user.id,
      eventType: "checkout_started",
      surface: "billing",
      source: "checkout",
      planType,
      channel: channel ?? "web",
    });

    return NextResponse.json({ url: session.url }, { headers: CORS_HEADERS });

  } catch (error: unknown) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500, headers: CORS_HEADERS });
  }
}
