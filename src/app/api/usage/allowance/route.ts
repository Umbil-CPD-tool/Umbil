import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import { readProNotice, settleComplimentaryAccess } from "@/lib/billing/complimentary";
import { hasUnlimitedAccess } from "@/lib/store/usage";
import { bucketsFromRows } from "@/lib/usage/questionPool";
import { CPD_USAGE_FEATURE, QUESTION_USAGE_FEATURES, TOOL_USAGE_FEATURE } from "@umbil/shared";

export const OPTIONS = corsPreflight;

const endsLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const { data: auth } = await supabase.auth.getUser(token);
  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  await settleComplimentaryAccess(userId);

  const { data: profile } = await supabaseService
    .from("profiles")
    .select("is_pro, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  const { data: rows } = await supabaseService
    .from("usage_tracking")
    .select("feature, usage_count, last_reset_date")
    .eq("user_id", userId)
    .in("feature", [...QUESTION_USAGE_FEATURES, TOOL_USAGE_FEATURE, CPD_USAGE_FEATURE]);

  const notice = await readProNotice(userId);
  const billed = profile?.subscription_status === "active" || profile?.subscription_status === "trialing";
  const buckets = bucketsFromRows(rows ?? []);

  return NextResponse.json(
    {
      unlimited: hasUnlimitedAccess(profile),
      ...buckets,
      transition: notice && !billed
        ? {
            offer: notice.offer,
            accessUntil: notice.access_until,
            endsLabel: endsLabel(notice.access_until),
          }
        : null,
    },
    { headers: CORS_HEADERS }
  );
}
