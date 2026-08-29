// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { CORS_HEADERS, corsPreflight } from '@/lib/cors';
import { STRIPE_PRICES, isStripePlanType, isProPlanType } from '@/lib/stripePrices';
import { getAppBaseUrl } from '@/lib/security';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia' as any,
});

export const OPTIONS = corsPreflight;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id, planType } = body;

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

    const priceId = STRIPE_PRICES[planType];
    const baseUrl = getAppBaseUrl();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // Critical for the webhook to know who bought the subscription
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        planType: planType,
      },
      ...(isProPlanType(planType)
        ? {
            subscription_data: {
              trial_period_days: 30,
            },
          }
        : {}),
      success_url: `${baseUrl}/settings?payment=success`,
      cancel_url: `${baseUrl}/pro?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url }, { headers: CORS_HEADERS });

  } catch (error: unknown) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500, headers: CORS_HEADERS });
  }
}
