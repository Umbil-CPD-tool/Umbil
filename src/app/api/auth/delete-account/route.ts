// src/app/auth/delete-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";
import { supabase } from "@/lib/supabase";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";

export const OPTIONS = corsPreflight;

export async function DELETE(req: NextRequest) {
  // 1. Verify the user via the standard client (gets user from the cookie/token)
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 401, headers: CORS_HEADERS });
  }

  try {
    const userId = user.id;

    const [cyclesResult, surveysResult] = await Promise.allSettled([
      supabaseService.from('msf_cycles').select('id').eq('user_id', userId),
      supabaseService.from('psq_surveys').select('id').eq('user_id', userId),
    ]);

    const cycleIds =
      cyclesResult.status === 'fulfilled' && cyclesResult.value.data
        ? cyclesResult.value.data.map((row: { id: string }) => row.id)
        : [];
    const surveyIds =
      surveysResult.status === 'fulfilled' && surveysResult.value.data
        ? surveysResult.value.data.map((row: { id: string }) => row.id)
        : [];

    // 2. Explicitly delete associated data first
    await Promise.allSettled([
      supabaseService.from('cpd_entries').delete().eq('user_id', userId),
      supabaseService.from('profiles').delete().eq('id', userId),
      supabaseService.from('app_analytics').delete().eq('user_id', userId),
      supabaseService.from('chat_history').delete().eq('user_id', userId),
      supabaseService.from('pdp_goals').delete().eq('user_id', userId),
      supabaseService.from('tool_history').delete().eq('user_id', userId),
      supabaseService.from('tool_drafts').delete().eq('user_id', userId),
      supabaseService.from('usage_tracking').delete().eq('user_id', userId),
      cycleIds.length > 0
        ? supabaseService.from('msf_responses').delete().in('cycle_id', cycleIds)
        : Promise.resolve(),
      surveyIds.length > 0
        ? supabaseService.from('psq_responses').delete().in('survey_id', surveyIds)
        : Promise.resolve(),
    ]);

    await Promise.allSettled([
      supabaseService.from('msf_cycles').delete().eq('user_id', userId),
      supabaseService.from('psq_surveys').delete().eq('user_id', userId),
    ]);

    // 3. Use the Service Role client to delete the user from auth.users.
    const { error: deleteError } = await supabaseService.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Delete user error:", deleteError);
      throw new Error("Unable to delete account");
    }

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    console.error("Delete account exception:", err);
    return NextResponse.json({ error: "Unable to delete account" }, { status: 500, headers: CORS_HEADERS });
  }
}
