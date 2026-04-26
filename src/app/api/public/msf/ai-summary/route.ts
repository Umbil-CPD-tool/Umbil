import { NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabaseService';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { cycle_id } = body;

    // 1. Verify ownership and get responses
    const { data: cycle, error: cycleError } = await supabase
      .from('msf_cycles')
      .select('user_id')
      .eq('id', cycle_id)
      .single();

    if (cycleError || cycle.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 403 });
    }

    const { data: responses, error: responsesError } = await supabase
      .from('msf_responses')
      .select('strengths_text, improvements_text, role_type')
      .eq('cycle_id', cycle_id);

    if (responsesError) throw responsesError;

    if (!responses || responses.length === 0) {
      return NextResponse.json({ error: 'No feedback available to summarize' }, { status: 400 });
    }

    // 2. Format context for the LLM (Fixed explicit 'any' and 'number' types here)
    const context = responses.map((r: any, i: number) => `
      Colleague ${i + 1} (${r.role_type}):
      Strengths: ${r.strengths_text || 'None provided'}
      Areas for Improvement: ${r.improvements_text || 'None provided'}
    `).join('\n');

    // 3. Generate Summary
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert clinical appraiser assisting a doctor with their Multi-Source Feedback (MSF). 
          Review the provided anonymous colleague feedback. Write a highly professional, constructive "Executive Summary" 
          (max 2 paragraphs) highlighting common positive themes and summarizing the constructive criticism. 
          Then, write a "Draft CPD Reflection" written from the first-person perspective of the doctor, reflecting on this feedback 
          and stating how they will use it to improve their practice.`
        },
        {
          role: "user",
          content: `Here is the colleague feedback:\n${context}`
        }
      ],
      temperature: 0.7,
    });

    const aiText = completion.choices[0].message.content;

    return NextResponse.json({ summary: aiText });

  } catch (error) {
    console.error('Error generating AI MSF Summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}