import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";
import {
  classifyQuestionsIntoTopics,
  extractClinicalTopics,
  getCurrentWeekRange,
  getEncouragementMessage,
  toDateKeyFromIso,
  type WeeklySummaryData,
  type WeeklyTopic,
} from "@/lib/weeklySummary";

const authenticate = async (req: NextRequest) => {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return user;
};

const buildSummary = async (userId: string): Promise<WeeklySummaryData> => {
  const range = getCurrentWeekRange();

  const [
    questionsResult,
    cpdResult,
    toolsResult,
    profileResult,
  ] = await Promise.all([
    supabaseService
      .from("chat_history")
      .select("question, created_at")
      .eq("user_id", userId)
      .gte("created_at", range.weekStartIso)
      .lte("created_at", range.weekEndIso),
    supabaseService
      .from("cpd_entries")
      .select("tags, timestamp")
      .eq("user_id", userId)
      .gte("timestamp", range.weekStartIso)
      .lte("timestamp", range.weekEndIso),
    supabaseService
      .from("tool_history")
      .select("tool_name")
      .eq("user_id", userId)
      .gte("created_at", range.weekStartIso)
      .lte("created_at", range.weekEndIso),
    supabaseService
      .from("profiles")
      .select("weekly_summary_seen_week")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const questionRows = questionsResult.data || [];
  const cpdEntries = cpdResult.data || [];
  const toolRows = toolsResult.data || [];

  const questionsAsked = questionRows.length;
  const learningLogged = cpdEntries.length;

  const activeDaySet = new Set<string>();
  for (const row of questionRows) {
    const key = toDateKeyFromIso(row.created_at);
    if (key) activeDaySet.add(key);
  }
  for (const row of cpdEntries) {
    const key = toDateKeyFromIso(row.timestamp);
    if (key) activeDaySet.add(key);
  }
  const activeDays = activeDaySet.size;

  const questionTopics = classifyQuestionsIntoTopics(
    questionRows.map((r) => r.question || ""),
    8
  );
  const topQuestionTopic =
    questionTopics.length > 0 && questionTopics[0].count > 0
      ? questionTopics[0].name
      : null;

  const loggedTopics = extractClinicalTopics(cpdEntries, 5);

  const toolsByTypeMap: Record<string, number> = {};
  for (const row of toolRows) {
    const name = row.tool_name || "Tool";
    toolsByTypeMap[name] = (toolsByTypeMap[name] || 0) + 1;
  }

  const toolsByType: WeeklyTopic[] = Object.entries(toolsByTypeMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const toolsUsed = toolRows.length;
  const seenWeek = profileResult.data?.weekly_summary_seen_week ?? null;

  return {
    weekStart: range.weekStartDate,
    weekEnd: range.weekEndDate,
    isoWeekKey: range.isoWeekKey,
    alreadySeen: seenWeek === range.isoWeekKey,
    questionsAsked,
    learningLogged,
    activeDays,
    questionTopics,
    topQuestionTopic,
    loggedTopics,
    toolsUsed,
    toolsByType,
    encouragement: getEncouragementMessage(
      learningLogged,
      questionsAsked,
      activeDays,
      topQuestionTopic
    ),
  };
};

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await buildSummary(user.id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching weekly summary:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.action !== "dismiss") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { isoWeekKey } = getCurrentWeekRange();

    const { error } = await supabaseService
      .from("profiles")
      .update({ weekly_summary_seen_week: isoWeekKey })
      .eq("id", user.id);

    if (error) {
      console.error("Error dismissing weekly summary:", error);
      return NextResponse.json({ error: "Failed to dismiss" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, isoWeekKey });
  } catch (error) {
    console.error("Error dismissing weekly summary:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
