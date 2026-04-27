// src/app/api/public/msf/route.ts
import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';
import { supabaseService as supabase } from '@/lib/supabaseService';

export async function GET(request: Request) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: cycles, error: cyclesError } = await supabase
      .from('msf_cycles')
      .select('*, msf_responses(id)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (cyclesError) throw cyclesError;

    const mappedCycles = cycles.map((cycle: any) => ({
      ...cycle,
      response_count: cycle.msf_responses?.length || 0
    }));

    return NextResponse.json(mappedCycles);
  } catch (error) {
    console.error('Error fetching MSF cycles:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // This is the public submission endpoint, we bypass the auth check entirely.
    // We use supabaseService to bypass Row Level Security to write anonymous feedback.
    
    const body = await request.json();
    const { cycle_id, role_type, scores, strengths_text, improvements_text } = body;

    // Validate required fields
    if (!cycle_id || !role_type || !scores) {
        return NextResponse.json({ error: 'Missing required feedback data' }, { status: 400 });
    }

    const { error } = await supabaseService.from('msf_responses').insert([{ 
        cycle_id, 
        role_type, 
        scores, 
        strengths_text, 
        improvements_text,
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

export async function PATCH(request: Request) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { cycle_id, status } = body;

    const { data, error } = await supabase
      .from('msf_cycles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', cycle_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating MSF cycle:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}