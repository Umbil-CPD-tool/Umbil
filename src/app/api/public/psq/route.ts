import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { PSQ_COLLECTION, resolveOpenCollection } from "@/lib/publicFeedback";
import {
  MAX_SUBMISSION_BYTES,
  SUBMISSIONS_PER_IP_PER_HOUR,
  exceedsDeclaredSize,
  isValidAnswerMap,
  jsonByteLength,
} from "@/lib/feedbackLimits";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const gate = await resolveOpenCollection(PSQ_COLLECTION, id);

    if (!gate.ok) {
        return NextResponse.json(
          gate.closed ? { error: gate.error, status: 'closed' } : { error: gate.error },
          { status: gate.status }
        );
    }

    // Only the fields the public form renders — the row also holds owner data.
    return NextResponse.json({
      id: gate.collection.id,
      title: gate.collection.title,
      custom_questions: gate.collection.custom_questions,
    });

  } catch (e) {
     console.error("Survey fetch error:", e);
     return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (exceedsDeclaredSize(req)) {
    return NextResponse.json({ error: "Submission too large" }, { status: 413 });
  }

  if (!checkRateLimit(`psq-submit:${clientIp(req)}`, SUBMISSIONS_PER_IP_PER_HOUR)) {
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

    if (!isValidAnswerMap(answers) || jsonByteLength(answers) > MAX_SUBMISSION_BYTES) {
        return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
    }

    // A response is only accepted for a survey that exists and is still collecting.
    const gate = await resolveOpenCollection(PSQ_COLLECTION, survey_id);

    if (!gate.ok) {
        return NextResponse.json(
          gate.closed
            ? { error: "This survey has already collected all the responses it needs.", status: 'closed' }
            : { error: gate.error },
          { status: gate.status }
        );
    }

    // Service key needed to insert anonymous responses, which have no session.
    const { error } = await supabaseService.from('psq_responses').insert({
      survey_id: gate.collection.id,
      answers: answers,
      created_at: new Date().toISOString(),
    });

    if (error) {
        console.error("Submission Error:", error);
        return NextResponse.json({ error: "Submission Failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (e) {
    console.error("PSQ submission error:", e);
    return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
  }
}
