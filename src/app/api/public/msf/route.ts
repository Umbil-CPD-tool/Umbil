// src/app/api/public/msf/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';
import { supabaseService as supabase } from '@/lib/supabaseService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    // Use Service Key to bypass RLS for reading the cycle config publicly
    const { data, error } = await supabaseService
      .from('msf_cycles')
      .select('id, custom_questions, title, status')
      .eq('id', id)
      .single();

    if (error) {
        console.error("Survey Fetch Error:", error);
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Don't allow feedback if closed
    if (data.status === 'closed') {
        return NextResponse.json({ error: "Cycle Closed", status: 'closed' }, { status: 403 });
    }

    return NextResponse.json(data);

  } catch (e) {
     return NextResponse.json({ error: "Internal Error" }, { status: 500 });
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