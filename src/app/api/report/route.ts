// src/app/api/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService"; // Used to write to DB if RLS is tricky, but standard client works with policies above.
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const OPTIONS = corsPreflight;

export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(`report:${clientIp(req)}`, 20)) {
      return NextResponse.json({ error: "Unable to submit report" }, { status: 429, headers: CORS_HEADERS });
    }

    const { question, answer, reason } = await req.json();

    if (!question || !answer || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: CORS_HEADERS });
    }

    // 1. Get the current user ID securely
    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    let userId = null;

    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // 2. Insert into Supabase
    // We use supabaseService (Admin) here to ensure it writes regardless of complex RLS policies, 
    // guaranteeing you get the feedback.
    const { error } = await supabaseService
      .from("content_reports")
      .insert({
        user_id: userId,
        question,
        answer,
        reason
      });

    if (error) {
      console.error("Supabase Report Error:", error);
      return NextResponse.json({ error: "Unable to submit report" }, { status: 500, headers: CORS_HEADERS });
    }

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });

  } catch (err: unknown) {
    console.error("Report error:", err);
    return NextResponse.json({ error: "Unable to submit report" }, { status: 500, headers: CORS_HEADERS });
  }
}