import {
  API_PATHS,
  MAX_MEMORY_ITEMS,
  canonicalMemoryBody,
  categoryForMemory,
  joinMemoryBodies,
  memorySourceLabel,
  splitMemoryItems,
  validateManualMemory,
  type MemoryCategory,
  type MemorySource,
} from "@umbil/shared";
import { getWebsiteOrigin } from "./api";

import { getSupabase } from "./supabase";

export type ClinicianMemory = {
  id: string;
  body: string;
  source: MemorySource;
  category: MemoryCategory;
  created_at: string;
};

export { memorySourceLabel };

const TABLE = "clinician_memories";

const friendlyWriteError = (error: { code?: string } | null): string => {
  if (error?.code === "23505") return "You already have that memory.";
  return "Could not save that memory. Please try again.";
};

const requireUserId = async (): Promise<string> => {
  const {
    data: { user },
    error,
  } = await getSupabase().auth.getUser();
  if (error || !user) throw new Error("Sign in to edit memory.");
  return user.id;
};

const selectActive = async (userId: string): Promise<ClinicianMemory[]> => {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("id, body, source, category, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw new Error("Could not load memories.");
  return (data ?? []) as ClinicianMemory[];
};

const cacheMemories = async (userId: string, bodies: string[]): Promise<void> => {
  const text = joinMemoryBodies(bodies.map(canonicalMemoryBody));
  const { error } = await getSupabase()
    .from("profiles")
    .update({ custom_instructions: text || null })
    .eq("id", userId);
  if (error) throw new Error("Could not update memory. Please try again.");
};

const importLegacyIfEmpty = async (userId: string, rows: ClinicianMemory[]): Promise<ClinicianMemory[]> => {
  if (rows.length > 0) return rows;

  const { data, error } = await getSupabase()
    .from("profiles")
    .select("custom_instructions")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data?.custom_instructions) return rows;

  for (const body of splitMemoryItems(data.custom_instructions)) {
    const { error: insertError } = await getSupabase().from(TABLE).insert({
      user_id: userId,
      body,
      source: "legacy",
      category: categoryForMemory(body),
      status: "active",
    });
    if (insertError && insertError.code !== "23505") throw new Error("Could not load memories.");
  }

  return selectActive(userId);
};

export const listMyMemories = async (): Promise<ClinicianMemory[]> => {
  const userId = await requireUserId();
  return importLegacyIfEmpty(userId, await selectActive(userId));
};

export const addMyMemory = async (raw: string): Promise<ClinicianMemory> => {
  const verdict = validateManualMemory(raw);
  if (!verdict.ok) throw new Error(verdict.reason);

  const userId = await requireUserId();
  const { count, error: countError } = await getSupabase()
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");

  if (countError) throw new Error("Could not save that memory. Please try again.");
  if ((count ?? 0) >= MAX_MEMORY_ITEMS) {
    throw new Error("Umbil keeps up to 40 memories. Delete one to add another.");
  }

  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert({
      user_id: userId,
      body: verdict.body,
      source: "manual",
      category: verdict.category,
      status: "active",
    })
    .select("id, body, source, category, created_at")
    .single();

  if (error || !data) throw new Error(friendlyWriteError(error));
  const created = data as ClinicianMemory;
  const rows = await selectActive(userId);
  await cacheMemories(userId, rows.map((row) => row.body));
  return created;
};

export const updateMyMemory = async (id: string, raw: string): Promise<ClinicianMemory> => {
  const verdict = validateManualMemory(raw);
  if (!verdict.ok) throw new Error(verdict.reason);

  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({
      body: verdict.body,
      category: verdict.category,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, body, source, category, created_at")
    .single();

  if (error || !data) throw new Error(friendlyWriteError(error));
  const updated = data as ClinicianMemory;
  const rows = await selectActive(userId);
  await cacheMemories(userId, rows.map((row) => row.body));
  return updated;
};

export const deleteMyMemory = async (id: string): Promise<void> => {
  const userId = await requireUserId();
  const { data: existing } = await getSupabase()
    .from(TABLE)
    .select("body")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const remaining = (await selectActive(userId)).filter((row) => row.id !== id);
  if (remaining.length === 0) await cacheMemories(userId, []);

  const { error } = await getSupabase().from(TABLE).delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error("Could not delete that memory. Please try again.");
  if (existing?.body) {
    await getSupabase()
      .from("clinician_memory_signals")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("body", existing.body);
  }
  if (remaining.length > 0) await cacheMemories(userId, remaining.map((row) => row.body));
};

export type CountingSignal = {
  id: string;
  body: string;
  count: number;
};

export const listCountingSignals = async (): Promise<CountingSignal[]> => {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("clinician_memory_signals")
    .select("id, body, count")
    .eq("user_id", userId)
    .eq("status", "counting")
    .order("updated_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as CountingSignal[];
};

export const dismissCountingSignal = async (id: string): Promise<void> => {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("clinician_memory_signals")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error("Could not dismiss that.");
};

export const reportOutputEdit = async (original: string, edited: string, toolId: string): Promise<{ promoted?: boolean; body?: string }> => {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return {};
  const response = await fetch(`${getWebsiteOrigin()}${API_PATHS.memoryCorrection}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ original, edited, toolId }),
  });
  if (!response.ok) return {};
  return response.json();
};
