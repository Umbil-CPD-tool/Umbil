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

    // 2. Explicitly delete associated data first
    // FIX: Added 'pdp_goals' to this list so they don't block deletion
    await Promise.allSettled([
      supabaseService.from('cpd_entries').delete().eq('user_id', userId),
      supabaseService.from('profiles').delete().eq('id', userId),
      supabaseService.from('app_analytics').delete().eq('user_id', userId),
      supabaseService.from('chat_history').delete().eq('user_id', userId),
      supabaseService.from('pdp_goals').delete().eq('user_id', userId), 
    ]);

    // 3. Use the Service Role client to delete the user from auth.users.
    const { error: deleteError } = await supabaseService.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Delete user error:", deleteError);
      // Pass the actual database error message back to the frontend
      throw new Error(deleteError.message);
    }

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    console.error("Delete account exception:", err);
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS_HEADERS });
  }
}