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
    // 1. Get the Authorization token from the headers
    const token = request.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized - No Token' }, { status: 401 });

    // 2. Verify the user using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized - Invalid User' }, { status: 401 });

    const body = await request.json();
    const { cycle_id, averages } = body;

    // 3. Verify ownership using Service Key
    const { data: cycle, error: cycleError } = await supabaseService
      .from('msf_cycles')
      .select('user_id')
      .eq('id', cycle_id)
      .single();

    if (cycleError || cycle.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized or cycle not found' }, { status: 403 });
    }

    // 4. THE FIX: Only select columns that actually exist in the msf_responses table!
    const { data: responses, error: responsesError } = await supabaseService
      .from('msf_responses')
      .select('strengths_text, improvements_text, role_type')
      .eq('cycle_id', cycle_id);

    if (responsesError) throw responsesError;

    if (!responses || responses.length === 0) {
      return NextResponse.json({ error: 'No feedback available to summarize' }, { status: 400 });
    }

    // 5. Format context for the LLM
    const context = responses.map((r: any, i: number) => {
      const strengths = r.strengths_text || 'None provided';
      const improvements = r.improvements_text || 'None provided';
      return `Colleague ${i + 1} (${r.role_type || 'Unknown'}):\nStrengths: ${strengths}\nImprovements: ${improvements}`;
    }).join('\n\n');

// 6. Generate Summary
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: `You are an expert clinical appraiser assisting a doctor with their Multi-Source Feedback (MSF). 
          
          Review the provided quantitative scores and anonymous colleague feedback. 
          
          Write a highly professional "Executive Summary" (max 2 paragraphs) highlighting common positive themes. If written feedback is sparse but quantitative scores are high, explicitly state that performance is highly rated across the board.
          
          Then, write a "Draft CPD Reflection" written from the first-person perspective of the doctor. Link the reflection to the GMC Good Medical Practice domains if appropriate.`
        },
        {
          role: "user",
          content: `Here is the colleague feedback:
          
          Quantitative Scores (out of 5):
          - Clinical Assessment: ${averages?.clinicalAssessment?.toFixed(1) || 'N/A'}
          - Communication: ${averages?.communication?.toFixed(1) || 'N/A'}
          - Teamwork: ${averages?.teamwork?.toFixed(1) || 'N/A'}
          - Professionalism: ${averages?.professionalism?.toFixed(1) || 'N/A'}
          
          Written Feedback:
          ${context}`
        }
      ],
      temperature: 0.6,
    });

    const aiText = completion.choices[0].message.content;

    // 7. Save the summary to the database so it persists on refresh!
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