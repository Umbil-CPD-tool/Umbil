import { getSupabase } from "../supabase";
import type { UsagePeriod } from "@umbil/shared";

export async function checkAndTrackUsage(
  userId: string,
  feature: string,
  limit: number,
  period: UsagePeriod
): Promise<boolean> {
  const client = getSupabase();

  const { data: profile, error: profileErr } = await client
    .from("profiles")
    .select("subscription_status, is_pro")
    .eq("id", userId)
    .single();

  if (profileErr && profileErr.code !== "PGRST116") {
    console.error("Error fetching profile for usage check:", profileErr);
  }

  if (profile?.subscription_status === "active" || profile?.is_pro) return true;

  const { data: usage, error: fetchError } = await client
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("feature", feature)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("checkAndTrackUsage Fetch Error:", fetchError);
  }

  const now = new Date();
  let count = usage?.usage_count || 0;
  let lastReset = usage?.last_reset_date
    ? new Date(usage.last_reset_date)
    : new Date(0);

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

  if (count >= limit) return false;

  await client.from("usage_tracking").upsert(
    {
      user_id: userId,
      feature,
      usage_count: count + 1,
      last_reset_date: lastReset.toISOString(),
    },
    { onConflict: "user_id, feature" }
  );

  return true;
}
