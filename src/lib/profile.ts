// src/lib/profile.ts
import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  email: string | null; 
  full_name: string | null;
  grade: string | null;
  dob: string | null;
  custom_instructions: string | null; // NEW: Memory field
  opt_in_updates?: boolean;    
  opt_in_newsletter?: boolean; 
};

export async function getMyProfile(): Promise<Profile | null> {
  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  if (uErr || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    // If user exists in Auth but not Profile table yet, return basic metadata
    if (user) {
      return {
        id: user.id,
        email: user.email || null, // Use auth email as fallback
        full_name: user.user_metadata?.full_name || null,
        grade: user.user_metadata?.grade || null,
        dob: null,
        custom_instructions: null,
        opt_in_updates: false,
        opt_in_newsletter: false
      } as Profile;
    }
    return null;
  }
  return data as Profile;
}

export async function upsertMyProfile(p: Partial<Profile>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const payload: Partial<Profile> = {
    id: user.id,
    email: user.email, // Always ensure email is kept in sync
    full_name: p.full_name,
    grade: p.grade,
    dob: p.dob,
    custom_instructions: p.custom_instructions, // NEW: Save memory
    opt_in_updates: p.opt_in_updates,
    opt_in_newsletter: p.opt_in_newsletter
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}