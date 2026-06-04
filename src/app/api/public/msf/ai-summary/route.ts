import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1',
});

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized - No Token' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized - Invalid User' }, { status: 401 });

    const body = await request.json();
    const { cycle_id, averages, stats } = body;

    const { data: cycle, error: cycleError } = await supabaseService
      .from('msf_cycles')
      .select('user_id')
      .eq('id', cycle_id)
      .single();

    if (cycleError || cycle.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized or cycle not found' }, { status: 403 });
    }

    const { data: responses, error: responsesError } = await supabaseService
      .from('msf_responses')
      .select('strengths_text, improvements_text, example_text, additional_comments, role_type')
      .eq('cycle_id', cycle_id);

    if (responsesError) throw responsesError;

    if (!responses || responses.length === 0) {
      return NextResponse.json({ error: 'No feedback available to summarize' }, { status: 400 });
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
          content: `You are an expert clinical appraiser evaluating a colleague's Multi-Source Feedback (MSF).
          
          Review the provided quantitative scores and anonymous colleague feedback.
          
          REQUIRED STRUCTURE (Use exactly these headers with NO formatting):
          
          APPRAISAL-READY SUMMARY
          (Write a data-driven 1-paragraph summary. Format it similar to: "${totalResponsesCount} colleague responses were collected across various multidisciplinary roles. Overall satisfaction was highly positive, with strong scores in [Top Domains]. Free-text feedback highlighted [Themes] as particular strengths. One area identified for continued development was [Improvement area].")
          
          WHAT COLLEAGUES VALUED MOST
          (Reflect on the positive themes using first-person clinical language: "I am pleased that my colleagues noted...")
          
          WHAT SURPRISED ME
          (Reflect on any unexpected feedback, trends, or particularly high/low scores in the first-person)
          
          WHAT I WILL CONTINUE DOING
          (State first-person clinical behaviors and communication strategies you will maintain to ensure effective teamwork and patient safety)
          
          WHAT I WILL IMPROVE
          (State first-person actionable steps to address the lowest scoring area or constructive feedback)
          
          PDP SUGGESTIONS
          (Propose 1-2 concrete, actionable Personal Development Plan goals based on this specific colleague feedback)
          
          RULES:
          1. Tone: Professional, highly reflective, introspective.
          2. STRICTLY PLAIN TEXT. NO markdown formatting, NO bolding (**), NO asterisks, NO hash symbols (##).
          3. Do NOT include greetings, sign-offs, or placeholder names (e.g. [Doctor Name]). Never invent a name.`
        },
        {
          role: "user",
          content: `Here is the colleague feedback:
          
          Quantitative Scores (out of 5):
          - Domain 1 (Knowledge, Skills & Performance): ${averages?.domain1?.toFixed(1) || 'N/A'}
          - Domain 2 (Safety & Quality): ${averages?.domain2?.toFixed(1) || 'N/A'}
          - Domain 3 (Communication & Teamwork): ${averages?.domain3?.toFixed(1) || 'N/A'}
          - Domain 4 (Maintaining Trust): ${averages?.domain4?.toFixed(1) || 'N/A'}
          
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

    return NextResponse.json({ summary: aiText });

  } catch (error: any) {
    console.error('Error generating AI MSF Summary:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}