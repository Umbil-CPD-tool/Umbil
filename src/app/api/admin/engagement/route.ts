import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/engagement/requireAdmin";
import { fetchEngagementPayload } from "@/lib/engagement/fetchReport";
import { sendWeeklyEngagementReport } from "@/lib/engagement/sendReport";
import { DEFAULT_TREND_RANGE, isTrendRangeId } from "@/lib/engagement/trendRange";

export const GET = async () => {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await fetchEngagementPayload();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Admin engagement GET failed:", error);
    return NextResponse.json({ error: "Could not load report" }, { status: 500 });
  }
};

export const POST = async (req: NextRequest) => {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { slack?: boolean; range?: string };
  const range = body.range && isTrendRangeId(body.range) ? body.range : DEFAULT_TREND_RANGE;
  try {
    const result = await sendWeeklyEngagementReport({
      email: true,
      slack: body.slack !== false,
      range,
    });
    return NextResponse.json({
      success: true,
      emailed: result.emailed,
      slack: result.slack,
    });
  } catch (error) {
    console.error("Admin engagement send failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send failed" },
      { status: 500 }
    );
  }
};
