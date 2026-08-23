import type { PDPGoal } from "@umbil/shared";

import { getSupabase } from "../supabase";

const PDP_TABLE = "pdp_goals";

export async function getPDP(): Promise<PDPGoal[]> {
  const { data, error } = await getSupabase()
    .from(PDP_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  return error ? [] : (data as PDPGoal[]);
}

export async function addPDP(goal: Omit<PDPGoal, "id" | "user_id">) {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  if (!user) {
    return { data: null, error: { message: "No user" } };
  }
  const { data, error } = await getSupabase()
    .from(PDP_TABLE)
    .insert({ user_id: user.id, ...goal })
    .select()
    .single();
  return { data: data as PDPGoal | null, error };
}

export async function deletePDP(id: string) {
  const { error } = await getSupabase().from(PDP_TABLE).delete().eq("id", id);
  return { error };
}
