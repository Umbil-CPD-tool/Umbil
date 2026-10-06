import type { CPDEntry } from "@umbil/shared";

import { getSupabase } from "../supabase";
import { checkAndTrackUsage } from "./usage";

const CPD_TABLE = "cpd_entries";
const CPD_LIST_COLUMNS = "id, timestamp, question, answer, reflection, tags, duration";
const CPD_PAGE_CAP = 100;

export type CpdLogQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  tag?: string;
};

const sanitizeSearch = (value: string) =>
  value.replace(/[%_,.()]/g, " ").replace(/\s+/g, " ").trim();

export async function getAllLogs(query: CpdLogQuery = {}): Promise<{
  data: CPDEntry[];
  error: { message: string } | null;
  count: number;
}> {
  const page = Math.max(0, query.page ?? 0);
  const pageSize = Math.min(CPD_PAGE_CAP, Math.max(1, query.pageSize ?? 10));
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const client = getSupabase();

  let request = client
    .from(CPD_TABLE)
    .select(CPD_LIST_COLUMNS, { count: "exact" })
    .order("timestamp", { ascending: false });

  const search = query.search ? sanitizeSearch(query.search) : "";
  if (search) {
    const pattern = `"%${search.replace(/"/g, "")}%"`;
    request = request.or(
      `question.ilike.${pattern},answer.ilike.${pattern},reflection.ilike.${pattern}`
    );
  }
  if (query.tag) {
    request = request.contains("tags", [query.tag]);
  }

  const { data, error, count } = await request.range(from, to);
  return {
    data: (data as CPDEntry[]) || [],
    error: error ? { message: error.message } : null,
    count: count ?? 0,
  };
}

export async function getMatchingLogs(query: Pick<CpdLogQuery, "search" | "tag"> = {}): Promise<CPDEntry[]> {
  const pageSize = CPD_PAGE_CAP;
  const all: CPDEntry[] = [];
  let page = 0;
  let total = Number.POSITIVE_INFINITY;

  while (all.length < total && page < 50) {
    const { data, error, count } = await getAllLogs({ ...query, page, pageSize });
    if (error) break;
    total = count;
    all.push(...data);
    if (data.length === 0) break;
    page += 1;
  }

  return all;
}

export async function getCpdTags(): Promise<string[]> {
  const { data, error } = await getSupabase().from(CPD_TABLE).select("tags");
  if (error || !data) return [];
  const tags = data.flatMap((row) => (Array.isArray(row.tags) ? row.tags : []));
  return Array.from(new Set(tags.filter((tag): tag is string => typeof tag === "string"))).sort();
}

export async function getCpdTimestamps(): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from(CPD_TABLE)
    .select("timestamp")
    .order("timestamp", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => String(row.timestamp));
}

export async function getCpdById(id: string): Promise<CPDEntry | null> {
  const { data, error } = await getSupabase()
    .from(CPD_TABLE)
    .select(CPD_LIST_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return error || !data ? null : (data as CPDEntry);
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
