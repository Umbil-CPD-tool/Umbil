"use client";

import { supabase } from "@/lib/supabase";
import type { ClientFunnelEvent } from "./conversionFunnel";

type FunnelDetails = {
  source?: string;
  surface?: "question" | "tool" | "cpd";
  feature?: string;
  planType?: string;
  channel?: "web" | "app";
};

/** Fire-and-forget. A failed beacon must not block the upgrade flow. */
export const trackFunnelEvent = (event: ClientFunnelEvent, details: FunnelDetails = {}) => {
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      await fetch("/api/analytics/funnel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ event, channel: "web", ...details }),
        keepalive: true,
      });
    } catch {
      // Analytics must not affect the page the clinician is on.
    }
  })();
};
