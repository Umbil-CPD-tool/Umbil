import { supabase } from "@/lib/supabase";
import type { PDPGoal } from "./types";

export type { PDPGoal } from "./types";

const PDP_TABLE = "pdp_goals";

export async function getPDP(): Promise<PDPGoal[]> {
  const { data, error } = await supabase
    .from(PDP_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  return error ? [] : (data as PDPGoal[]);
}

export async function addPDP(goal: Omit<PDPGoal, "id" | "user_id">) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      data: null,
      error: { message: "No user", code: "401", details: "", hint: "", name: "AuthError" },
    };
  const { data, error } = await supabase
    .from(PDP_TABLE)
    .insert({ user_id: user.id, ...goal })
    .select()
    .single();
  return { data: data as PDPGoal | null, error };
}

export async function deletePDP(id: string) {
  const { error } = await supabase.from(PDP_TABLE).delete().eq("id", id);
  return { error };
}

export function clearAll() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("cpd_log");
    localStorage.removeItem("pdp_goals");
  }
}
