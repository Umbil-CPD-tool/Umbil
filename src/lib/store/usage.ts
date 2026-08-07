import { supabase } from "@/lib/supabase";
import type { UsagePeriod } from "./types";

export type { UsagePeriod } from "./types";

export async function checkAndTrackUsage(
  userId: string,
  feature: string,
  limit: number,
  period: UsagePeriod,
  customClient?: any
): Promise<boolean> {
  const client = customClient || supabase;

  const { data: profile, error: profileErr } = await client
    .from("profiles")
    .select("subscription_status, is_pro")
    .eq("id", userId)
    .single();

  if (profileErr && profileErr.code !== "PGRST116") {
    console.error(`❌ Error fetching profile for usage check:`, profileErr);
  }

  if (profile?.subscription_status === "active" || profile?.is_pro) return true;

  const { data: usage, error: fetchError } = await client
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("feature", feature)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("❌ checkAndTrackUsage Fetch Error:", fetchError);
  }

  const now = new Date();
  let count = usage?.usage_count || 0;
  let lastReset = usage?.last_reset_date ? new Date(usage.last_reset_date) : new Date(0);

  let needsReset = false;
  if (period === "daily") {
    needsReset = now.toDateString() !== lastReset.toDateString();
  } else if (period === "monthly") {
    needsReset =
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear();
  } else if (period === "yearly") {
    needsReset = now.getFullYear() !== lastReset.getFullYear();
  }

  if (needsReset) {
    count = 0;
    lastReset = now;
  }

  if (count >= limit) {
    console.log(`🛑 User hit limit for ${feature} (${count}/${limit})`);
    return false;
  }

  const { error: upsertError } = await client.from("usage_tracking").upsert(
    {
      user_id: userId,
      feature,
      usage_count: count + 1,
      last_reset_date: lastReset.toISOString(),
    },
    { onConflict: "user_id, feature" }
  );

  if (upsertError) {
    console.error("❌ checkAndTrackUsage Upsert Error:", upsertError);
  }

  return true;
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server-side";
  let id = localStorage.getItem("umbil_device_id");
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `device_${Date.now()}`;
    localStorage.setItem("umbil_device_id", id);
  }
  return id;
}
