// src/app/api/stripe/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import { getAppBaseUrl } from "@/lib/security";

// Initialize Stripe with a fallback for build-time safety
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_dummy_build_key", {
  apiVersion: "2026-03-25.dahlia" as any, 
});

export const OPTIONS = corsPreflight;

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
    
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });

    const { data: profile } = await supabaseService
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id ?? null;

    // Older Pro accounts sometimes have a Stripe customer without it stored on
    // the profile. Resolve by email so Manage Subscription still opens.
    if (!customerId && user.email) {
      const matches = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = matches.data[0]?.id ?? null;
      if (customerId) {
        await supabaseService
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
      }
    }

    if (!customerId) {
        return NextResponse.json({ error: "No billing profile found" }, { status: 404, headers: CORS_HEADERS });
    }

    const baseUrl = getAppBaseUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/settings`,
    });

    return NextResponse.json({ url: session.url }, { headers: CORS_HEADERS });

  } catch (err: unknown) {
    console.error("Portal Error:", err);
    return NextResponse.json({ error: "Unable to open billing portal" }, { status: 500, headers: CORS_HEADERS });
  }
}
