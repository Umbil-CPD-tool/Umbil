import Stripe from "stripe";
import { collectStripeRevenue, type StripeRevenueSummary } from "@/lib/stripe/revenue";

export const loadStripeRevenue = async (now = new Date()): Promise<StripeRevenueSummary> => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "sk_dummy_build_key") {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  const stripe = new Stripe(key, {
    apiVersion: "2026-03-25.dahlia",
  });

  return collectStripeRevenue(
    {
      listSubscriptions: async (startingAfter) => {
        const page = await stripe.subscriptions.list({
          status: "all",
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        return { data: page.data as unknown[], has_more: page.has_more };
      },
      listInvoices: async (startingAfter) => {
        const page = await stripe.invoices.list({
          status: "paid",
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        return { data: page.data as unknown[], has_more: page.has_more };
      },
    },
    now
  );
};
