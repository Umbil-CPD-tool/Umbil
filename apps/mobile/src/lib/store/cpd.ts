import type { CPDEntry } from "@umbil/shared";

import { getSupabase } from "../supabase";
import { checkAndTrackUsage } from "./usage";

const CPD_TABLE = "cpd_entries";

export async function getAllLogs(): Promise<{
  data: CPDEntry[];
  error: { message: string } | null;
}> {
  const { data, error } = await getSupabase()
    .from(CPD_TABLE)
    .select("*")
    .order("timestamp", { ascending: false });

  return { data: (data as CPDEntry[]) || [], error };
}

export async function getCPD(): Promise<CPDEntry[]> {
  const { data, error } = await getSupabase()
    .from(CPD_TABLE)
    .select("timestamp, tags, duration")
    .order("timestamp", { ascending: false });
  return error ? [] : (data as CPDEntry[]);
}

export async function deleteCPD(id: string) {
  const { error } = await getSupabase().from(CPD_TABLE).delete().eq("id", id);
  return { error };
}

export async function updateCPD(id: string, updates: Partial<CPDEntry>) {
  const { error } = await getSupabase().from(CPD_TABLE).update(updates).eq("id", id);
  return { error };
}

export async function addCPD(entry: Omit<CPDEntry, "id" | "user_id">) {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  const user = session?.user;

  if (!user) {
    return {
      data: null,
      error: { message: "User not authenticated. Please sign in again." },
    };
  }

  const isAllowed = await checkAndTrackUsage(user.id, "cpd", 10, "monthly");
  if (!isAllowed) {
    return { data: null, error: { message: "LIMIT_REACHED" } };
  }

  const payload = {
    user_id: user.id,
    timestamp: new Date().toISOString(),
    question: entry.question,
    answer: entry.answer,
    reflection: entry.reflection || null,
    tags: entry.tags || [],
    duration: entry.duration || 10,
  };

  const { data, error } = await getSupabase()
    .from(CPD_TABLE)
    .insert(payload)
    .select()
    .single();

  return { data: data as CPDEntry | null, error };
}
