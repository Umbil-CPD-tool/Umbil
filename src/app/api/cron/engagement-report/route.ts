import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyEngagementReport } from "@/lib/engagement/sendReport";
import { fetchEngagementPayload } from "@/lib/engagement/fetchReport";

const isAuthorized = (req: NextRequest): boolean => {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const querySecret = req.nextUrl.searchParams.get("secret");
  const authHeader = req.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  return querySecret === expected || bearerSecret === expected;
};

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (req.nextUrl.searchParams.get("dry_run") === "1") {
      const payload = await fetchEngagementPayload();
      return NextResponse.json({ dry_run: true, payload });
    }

    const result = await sendWeeklyEngagementReport();
    return NextResponse.json({
      success: true,
      emailed: result.emailed,
      slack: result.slack,
      wau: result.payload.snapshot.wau,
      mau: result.payload.snapshot.mau,
    });
  } catch (error) {
    console.error("Cron engagement-report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
