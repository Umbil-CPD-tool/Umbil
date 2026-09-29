import type { Metadata } from "next";
import { fetchEngagementPayload } from "@/lib/engagement/fetchReport";
import { loadStripeRevenue } from "@/lib/stripe/revenueServer";
import EngagementDashboard from "./EngagementDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Engagement",
  robots: { index: false, follow: false },
};

const EngagementPage = async () => {
  const [payload, revenueResult] = await Promise.all([
    fetchEngagementPayload(),
    loadStripeRevenue().then(
      (revenue) => ({ revenue, error: null as string | null }),
      (error: unknown) => {
        const message = error instanceof Error ? error.message : "Stripe revenue failed";
        console.error("Stripe revenue failed:", message.replace(/sk_(live|test)_\S+/gi, "sk_redacted"));
        const errorText = /expired api key/i.test(message)
          ? "Stripe rejected the API key as expired. The rest of this report is unchanged."
          : /STRIPE_SECRET_KEY is not set/i.test(message)
            ? "Stripe is not configured on this server. The rest of this report is unchanged."
            : "Stripe revenue is unavailable right now. The rest of this report is unchanged.";
        return {
          revenue: null,
          error: errorText,
        };
      }
    ),
  ]);

  return (
    <EngagementDashboard
      payload={payload}
      revenue={revenueResult.revenue}
      revenueError={revenueResult.error}
    />
  );
};

export default EngagementPage;
