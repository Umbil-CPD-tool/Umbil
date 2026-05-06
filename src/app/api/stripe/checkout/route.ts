// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia' as any,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id, priceId, planType } = body;

    // Dynamically determine the base URL to prevent localhost redirects in production
    const origin = req.headers.get('origin');
    const baseUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // --- PATH A: SUBSCRIPTION (Pro Plan Upgrade) ---
    if (priceId && planType) {
      // Extract user token from headers to attach their ID to the Stripe session
      const token = req.headers.get("authorization")?.split("Bearer ")[1];
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        success_url: `${baseUrl}/settings?payment=success`,
        cancel_url: `${baseUrl}/pro?payment=cancelled`,
      });

      return NextResponse.json({ url: session.url });
    }

    // --- PATH B: ONE-OFF PAYMENT (PSQ / MSF Reports) ---
    if (type && id) {
      let unit_amount = 0;
      let name = '';

      if (type === 'psq') {
        unit_amount = 1900; // £19.00
        name = 'Umbil PSQ Report Unlock';
      } else if (type === 'msf') {
        unit_amount = 2400; // £24.00
        name = 'Umbil MSF Report & AI Unlock';
      } else {
        return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: name,
              },
              unit_amount: unit_amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        // Critical for the webhook to know which cycle to unlock
        metadata: {
          product_type: type,
          target_id: id,
        },
        success_url: `${baseUrl}/psq?tab=${type}&payment=success`,
        cancel_url: `${baseUrl}/psq?tab=${type}&payment=cancelled`,
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: 'Missing required fields for checkout' }, { status: 400 });

  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}