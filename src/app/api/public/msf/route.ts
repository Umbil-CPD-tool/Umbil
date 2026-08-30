import { NextResponse, NextRequest } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { MSF_COLLECTION, resolveOpenCollection } from '@/lib/publicFeedback';
import {
  MAX_ROLE_CHARS,
  MAX_SUBMISSION_BYTES,
  MAX_TEXT_ANSWER_CHARS,
  SUBMISSIONS_PER_IP_PER_HOUR,
  exceedsDeclaredSize,
  isValidAnswerMap,
  isValidFreeText,
  jsonByteLength,
} from '@/lib/feedbackLimits';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const gate = await resolveOpenCollection(MSF_COLLECTION, id);

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
      status: gate.collection.status,
    });

  } catch (e) {
     console.error("Cycle fetch error:", e);
     return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (exceedsDeclaredSize(request)) {
    return NextResponse.json({ error: "Submission too large" }, { status: 413 });
  }

  if (!checkRateLimit(`msf-submit:${clientIp(request)}`, SUBMISSIONS_PER_IP_PER_HOUR)) {
    return NextResponse.json(
      { error: "Too many submissions from this device. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { cycle_id, role_type, scores, strengths_text, improvements_text, example_text, additional_comments } = body;

    if (!cycle_id || !role_type || !scores) {
        return NextResponse.json({ error: 'Missing required feedback data' }, { status: 400 });
    }

    if (typeof role_type !== 'string' || role_type.length > MAX_ROLE_CHARS) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // `scores` mixes Likert ratings with free text from optional custom questions.
    if (!isValidAnswerMap(scores)) {
        return NextResponse.json({ error: 'Invalid ratings' }, { status: 400 });
    }

    const freeText = [strengths_text, improvements_text, example_text, additional_comments];
    if (!freeText.every(isValidFreeText)) {
        return NextResponse.json(
          { error: `Comments must be ${MAX_TEXT_ANSWER_CHARS} characters or fewer.` },
          { status: 400 }
        );
    }

    if (jsonByteLength(body) > MAX_SUBMISSION_BYTES) {
        return NextResponse.json({ error: "Submission too large" }, { status: 413 });
    }

    const gate = await resolveOpenCollection(MSF_COLLECTION, cycle_id);

    if (!gate.ok) {
        return NextResponse.json(
          gate.closed
            ? { error: "This cycle has already collected all the feedback it needs.", status: 'closed' }
            : { error: gate.error },
          { status: gate.status }
        );
    }

    // Service key needed to insert anonymous responses, which have no session.
    const { error } = await supabaseService.from('msf_responses').insert([{
        cycle_id: gate.collection.id,
        role_type,
        scores,
        strengths_text,
        improvements_text,
        example_text,
        additional_comments,
        created_at: new Date().toISOString()
    }]);

    if (error) {
        console.error("Submission Error:", error);
        return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error handling MSF submission:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
