// src/app/api/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService"; // Used to write to DB if RLS is tricky, but standard client works with policies above.
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";

export const OPTIONS = corsPreflight;

export async function POST(req: NextRequest) {
  try {
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
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS_HEADERS });
  }
}