import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

export const dynamic = 'force-dynamic';

// --- RATE LIMITING ---
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;
const ipRequests = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequests.get(ip);
  if (!record || record.resetTime < now) {
      ipRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      return true;
  }
  if (record.count >= MAX_REQUESTS) {
      return false;
  }
  record.count++;
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    // Use Service Key to bypass RLS for reading the survey config
    const { data, error } = await supabaseService
      .from('psq_surveys')
      .select('id, custom_questions, title')
      .eq('id', id)
      .single();

    if (error) {
        console.error("Survey Fetch Error:", error);
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json(data);

  } catch (e) {
     return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Rate Limiting Check for Spam Prevention
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown-ip";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many submissions from this device. Please try again later." }, 
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { survey_id, answers } = body;

    if (!survey_id || !answers) {
        return NextResponse.json({ error: "Missing Data" }, { status: 400 });
    }

    // Use Service Key to bypass RLS for inserting anonymous responses
    const { error } = await supabaseService.from('psq_responses').insert({
      survey_id: survey_id,
      answers: answers,
      created_at: new Date().toISOString(),
    });

    if (error) {
        console.error("Submission Error:", error);
        return NextResponse.json({ error: "Submission Failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (e) {
    return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
  }
}