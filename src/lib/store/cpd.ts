import { supabase } from "@/lib/supabase";
import { type PostgrestError } from "@supabase/supabase-js";
import { checkAndTrackUsage } from "./usage";
import type { CPDEntry } from "./types";

export type { CPDEntry } from "./types";

const CPD_TABLE = "cpd_entries";

export async function getAllLogs(): Promise<{
  data: CPDEntry[];
  error: PostgrestError | null;
}> {
  const cacheBuster = `cache-bust-${Date.now()}`;

  const { data, error } = await supabase
    .from(CPD_TABLE)
    .select("*")
    .order("timestamp", { ascending: false })
    .neq("question", cacheBuster);

  if (error) console.error("Error fetching logs:", error);
  return { data: (data as CPDEntry[]) || [], error };
}

export async function getCPD(): Promise<CPDEntry[]> {
  const { data, error } = await supabase
    .from(CPD_TABLE)
    .select("timestamp, tags, duration")
    .order("timestamp", { ascending: false });
  return error ? [] : (data as CPDEntry[]);
}

export async function deleteCPD(id: string) {
  const { error } = await supabase.from(CPD_TABLE).delete().eq("id", id);
  return { error };
}

export async function updateCPD(id: string, updates: Partial<CPDEntry>) {
  const { error } = await supabase.from(CPD_TABLE).update(updates).eq("id", id);
  return { error };
}

export async function addCPD(entry: Omit<CPDEntry, "id" | "user_id">) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    console.error("addCPD: User not authenticated");
    return {
      data: null,
      error: {
        message: "User not authenticated. Please refresh or sign in again.",
        details: "",
        hint: "",
        code: "401",
      } as any,
    };
  }

  const isAllowed = await checkAndTrackUsage(user.id, "cpd", 10, "monthly");
  if (!isAllowed) {
    return { data: null, error: { message: "LIMIT_REACHED" } as any };
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

  const { data, error } = await supabase
    .from(CPD_TABLE)
    .insert(payload)
    .select()
    .single();
  return { data: data as CPDEntry | null, error };
}
