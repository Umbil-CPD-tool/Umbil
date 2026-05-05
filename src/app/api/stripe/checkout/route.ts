// src/app/api/stripe/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: Request) {
  try {
    const { type, id } = await req.json();

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
      // The webhook needs these to know what to update
      metadata: {
        product_type: type,
        target_id: id,
      },
      // Redirect back to the PSQ dashboard on success
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/psq?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/psq?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}