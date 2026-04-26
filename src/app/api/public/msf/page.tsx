import { NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabaseService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cycle_id, role_type, scores, strengths_text, improvements_text } = body;

    if (!cycle_id || !role_type || !scores) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify the cycle exists and is still open
    const { data: cycle, error: cycleError } = await supabase
      .from('msf_cycles')
      .select('status')
      .eq('id', cycle_id)
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json({ error: 'Feedback cycle not found' }, { status: 404 });
    }

    if (cycle.status !== 'open') {
      return NextResponse.json({ error: 'This feedback cycle is closed' }, { status: 403 });
    }

    // 2. Insert the anonymous response
    const { error: insertError } = await supabase
      .from('msf_responses')
      .insert([
        {
          cycle_id,
          role_type,
          scores,
          strengths_text,
          improvements_text,
        }
      ]);

    if (insertError) {
      console.error('Error inserting MSF response:', insertError);
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('MSF Submission Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}