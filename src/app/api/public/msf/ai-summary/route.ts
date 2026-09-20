import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';
import { CORS_HEADERS, corsPreflight } from '@/lib/cors';
import { appraisalPackSystemInstructions } from '@/lib/appraisalAi';

const openai = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1',
});

export const OPTIONS = corsPreflight;

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized - No Token' }, { status: 401, headers: CORS_HEADERS });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized - Invalid User' }, { status: 401, headers: CORS_HEADERS });

    const body = await request.json();
    const { cycle_id, averages, stats, domainScores, roleTypes } = body;

    const { data: cycle, error: cycleError } = await supabaseService
      .from('msf_cycles')
      .select('user_id')
      .eq('id', cycle_id)
      .single();

    if (cycleError || cycle.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized or cycle not found' }, { status: 403, headers: CORS_HEADERS });
    }

    const { data: profile } = await supabaseService
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single();

    if (profile?.is_pro !== true) {
      return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 403, headers: CORS_HEADERS });
    }

    const { data: responses, error: responsesError } = await supabaseService
      .from('msf_responses')
      .select('strengths_text, improvements_text, example_text, additional_comments, role_type')
      .eq('cycle_id', cycle_id);

    if (responsesError) throw responsesError;

    if (!responses || responses.length === 0) {
      return NextResponse.json({ error: 'No feedback available to summarize' }, { status: 400, headers: CORS_HEADERS });
    }

    const context = responses.map((r: any, i: number) => {
      const strengths = r.strengths_text || 'None provided';
      const example = r.example_text || 'None provided';
      const improvements = r.improvements_text || 'None provided';
      const additional = r.additional_comments || 'None provided';
      return `Colleague ${i + 1} (${r.role_type || 'Unknown'}):\nStrengths: ${strengths}\nExample given: ${example}\nImprovements: ${improvements}\nAdditional: ${additional}`;
    }).join('\n\n');

    const totalResponsesCount = stats?.totalResponses || responses.length;

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: appraisalPackSystemInstructions({
            audience: "colleagues",
            includeGmcMapping: true,
            responseCountHint: totalResponsesCount,
          }),
        },
        {
          role: "user",
          content: `Here is the colleague feedback:

Quantitative Scores (out of 5):
- Domain 1 (Knowledge, Skills & Performance): ${averages?.domain1?.toFixed?.(1) ?? averages?.domain1 ?? 'N/A'}
- Domain 2 (Safety & Quality): ${averages?.domain2?.toFixed?.(1) ?? averages?.domain2 ?? 'N/A'}
- Domain 3 (Communication & Teamwork): ${averages?.domain3?.toFixed?.(1) ?? averages?.domain3 ?? 'N/A'}
- Domain 4 (Maintaining Trust): ${averages?.domain4?.toFixed?.(1) ?? averages?.domain4 ?? 'N/A'}

Domain breakdown (if provided): ${JSON.stringify(domainScores || [])}
Respondent roles: ${JSON.stringify(roleTypes || [])}
Overall average: ${stats?.averageScore ?? 'N/A'}/5.0

Written Feedback:
${context}`
        }
      ],
      temperature: 0.2,
    });

    const aiText = completion.choices[0].message.content;

    await supabaseService
      .from('msf_cycles')
      .update({ ai_summary: aiText })
      .eq('id', cycle_id);

    return NextResponse.json({ summary: aiText }, { headers: CORS_HEADERS });

  } catch (error: any) {
    console.error('Error generating AI MSF Summary:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: CORS_HEADERS });
  }
}
