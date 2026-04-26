import { NextResponse } from 'next/server';
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

    // Transform to inject response count easily (Fixed explicit 'any' type here)
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const requiredResponses = body.required_responses || 10;

    const { data, error } = await supabase
      .from('msf_cycles')
      .insert([{ user_id: user.id, status: 'open', required_responses: requiredResponses }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating MSF cycle:', error);
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