// src/app/api/user/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";

export const OPTIONS = corsPreflight;

const startOfCurrentMonthIso = () => {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
};

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });

    const monthStart = startOfCurrentMonthIso();

    const [questionsResult, capturesResult, toolsResult] = await Promise.all([
      supabaseService
        .from("chat_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart),
      supabaseService
        .from("cpd_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("timestamp", monthStart),
      supabaseService
        .from("tool_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart),
    ]);

    if (questionsResult.error) console.error("stats: chat_history query failed:", questionsResult.error);
    if (capturesResult.error) console.error("stats: cpd_entries query failed:", capturesResult.error);
    if (toolsResult.error) console.error("stats: tool_history query failed:", toolsResult.error);

    return NextResponse.json({
      questions: questionsResult.count || 0,
      tools: toolsResult.count || 0,
      captures: capturesResult.count || 0,
    }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: CORS_HEADERS });
  }
}
