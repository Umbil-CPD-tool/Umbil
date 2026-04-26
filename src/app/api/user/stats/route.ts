// src/app/api/user/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Get Questions Asked from chat_history
    const { count: questionsCount } = await supabaseService
      .from('chat_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // 2. Get Learning Captures (assuming table is 'learning_captures' or similar. Adjust if different!)
    const { count: capturesCount } = await supabaseService
      .from('learning_captures')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // 3. Get Tools Generated from app_analytics (event_type = 'tool_used' or tracking table)
    const { count: toolsCount } = await supabaseService
      .from('usage_tracking') // fallback to your tracker table
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('feature_id', 'tools');

    return NextResponse.json({
      questions: questionsCount || 0,
      tools: toolsCount || 0,
      captures: capturesCount || 0
    });

  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}