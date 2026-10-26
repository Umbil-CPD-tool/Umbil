// Server-side clinician memory. Rows are the source of truth.
// profiles.custom_instructions stays as a joined cache for anything that still reads it.
import { supabaseService } from "@/lib/supabaseService";
import { normaliseMemory, truncateMemory } from "@/lib/memoryRules";
import {
  canonicalMemoryBody,
  categoryForMemory,
  diffMemoryBodies,
  joinMemoryBodies,
  memoryKey,
  splitMemoryItems,
  type MemoryCategory,
  type MemorySource,
} from "@umbil/shared";

const TABLE = "clinician_memories";

export type StoredClinicianMemory = {
  id: string;
  body: string;
  source: MemorySource;
  category: MemoryCategory;
  created_at: string;
};

const isUniqueViolation = (error: { code?: string } | null): boolean => error?.code === "23505";

export const renderMemoryForModel = (bodies: string[]): string => {
  const joined = joinMemoryBodies(bodies);
  if (!joined) return "";
  return truncateMemory(joined);
};

const listActive = async (userId: string): Promise<StoredClinicianMemory[]> => {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select("id, body, source, category, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as StoredClinicianMemory[];
};

const insertMemory = async (userId: string, body: string, source: MemorySource): Promise<void> => {
  const canonical = canonicalMemoryBody(body);
  const { error } = await supabaseService.from(TABLE).insert({
    user_id: userId,
    body: canonical,
    source,
    category: categoryForMemory(canonical),
    status: "active",
  });
  if (error && !isUniqueViolation(error)) throw error;
};

/** Imports the old single profile note the first time, then returns the joined text. */
export const loadClinicianMemory = async (
  userId: string,
  legacyBlob: string | null
): Promise<{ text: string | null }> => {
  let rows = await listActive(userId);
  if (rows.length === 0 && legacyBlob?.trim()) {
    for (const body of splitMemoryItems(legacyBlob)) {
      await insertMemory(userId, body, "legacy");
    }
    rows = await listActive(userId);
  }

  const text = renderMemoryForModel(rows.map((row) => row.body));
  return { text: text || null };
};

const writeMemoryCache = async (userId: string, text: string): Promise<void> => {
  const { error } = await supabaseService
    .from("profiles")
    .update({ custom_instructions: text || null })
    .eq("id", userId);
  if (error) console.error("[Umbil Memory] Profile cache update failed:", error);
};

/**
 * Applies a consolidator rewrite as added and removed notes.
 * Skips the write when the list changed after this request started.
 */
export const syncConsolidatedMemory = async (
  userId: string,
  previousText: string | null,
  nextText: string
): Promise<"saved" | "conflict" | "failed"> => {
  try {
    const rows = await listActive(userId);
    const currentText = renderMemoryForModel(rows.map((row) => row.body));
    if (normaliseMemory(currentText) !== normaliseMemory(previousText)) {
      return "conflict";
    }

    const { added, removed } = diffMemoryBodies(splitMemoryItems(previousText), splitMemoryItems(nextText));
    const removedKeys = new Set(removed.map(memoryKey));
    const idsToDelete = rows.filter((row) => removedKeys.has(memoryKey(row.body))).map((row) => row.id);

    if (idsToDelete.length > 0) {
      const { error } = await supabaseService.from(TABLE).delete().in("id", idsToDelete).eq("user_id", userId);
      if (error) {
        console.error("[Umbil Memory] Delete failed:", error);
        return "failed";
      }
    }

    for (const body of added) {
      await insertMemory(userId, body, "explicit");
    }

    const kept = rows.filter((row) => !removedKeys.has(memoryKey(row.body))).map((row) => row.body);
    const finalText = renderMemoryForModel([...kept, ...added.map(canonicalMemoryBody)]);
    await writeMemoryCache(userId, finalText);
    return "saved";
  } catch (error) {
    console.error("[Umbil Memory] Sync failed:", error);
    return "failed";
  }
};
