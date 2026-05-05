// src/lib/profile.ts
import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  email: string | null; 
  academic_email?: string | null; // NEW: Field for university email
  full_name: string | null;
  grade: string | null;
  dob: string | null;
  custom_instructions: string | null; 
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
    if (user) {
      return {
        id: user.id,
        email: user.email || null, 
        academic_email: null,
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
    email: user.email, 
    academic_email: p.academic_email, // NEW
    full_name: p.full_name,
    grade: p.grade,
    dob: p.dob,
    custom_instructions: p.custom_instructions, 
    opt_in_updates: p.opt_in_updates,
    opt_in_newsletter: p.opt_in_newsletter
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}