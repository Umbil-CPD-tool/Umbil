import { supabaseService } from "@/lib/supabaseService";
import {
  CORRECTION_PROMOTION_COUNT,
  canonicalMemoryBody,
  categoryForMemory,
  memoryKey,
  styleSignalByKey,
  type StyleSignal,
} from "@umbil/shared";

const TABLE = "clinician_memory_signals";

export type SignalRecordResult =
  | { status: "counting"; count: number; body: string }
  | { status: "promoted"; count: number; body: string }
  | { status: "dismissed"; count: number; body: string }
  | { status: "already_saved"; count: number; body: string }
  | { status: "skipped" };

type SignalRow = {
  id: string;
  signal_key: string;
  body: string;
  count: number;
  status: string;
};

const knownSignal = (signal: StyleSignal): StyleSignal | null => styleSignalByKey(signal.key);

export const recordStyleSignal = async (
  userId: string,
  signal: StyleSignal
): Promise<SignalRecordResult> => {
  const canonical = knownSignal(signal);
  if (!canonical) return { status: "skipped" };

  const body = canonicalMemoryBody(canonical.body);
  const { data: memories, error: memoryError } = await supabaseService
    .from("clinician_memories")
    .select("body")
    .eq("user_id", userId)
    .eq("status", "active");
  if (memoryError) throw memoryError;

  const alreadySaved = (memories ?? []).some((row) => memoryKey(String(row.body)) === memoryKey(body));
  if (alreadySaved) return { status: "already_saved", count: CORRECTION_PROMOTION_COUNT, body };

  const { data: existing, error: readError } = await supabaseService
    .from(TABLE)
    .select("id, signal_key, body, count, status")
    .eq("user_id", userId)
    .eq("signal_key", canonical.key)
    .maybeSingle();
  if (readError) throw readError;

  const row = existing as SignalRow | null;
  if (row?.status === "dismissed") return { status: "dismissed", count: row.count, body };
  if (row?.status === "promoted") return { status: "already_saved", count: row.count, body };

  const count = Math.min(20, (row?.count ?? 0) + 1);
  if (!row) {
    const { error } = await supabaseService.from(TABLE).insert({
      user_id: userId,
      signal_key: canonical.key,
      body,
      category: categoryForMemory(body),
      count,
      status: "counting",
    });
    if (error?.code === "23505") {
      const { error: raced } = await supabaseService
        .from(TABLE)
        .update({ count: 2, body, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("signal_key", canonical.key)
        .eq("status", "counting");
      if (raced) throw raced;
    } else if (error) {
      throw error;
    }
  } else {
    const { error } = await supabaseService
      .from(TABLE)
      .update({ count, body, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("user_id", userId);
    if (error) throw error;
  }

  if (count < CORRECTION_PROMOTION_COUNT) return { status: "counting", count, body };

  const { error: insertError } = await supabaseService.from("clinician_memories").insert({
    user_id: userId,
    body,
    source: "inferred",
    category: canonical.category,
    status: "active",
  });
  if (insertError && insertError.code !== "23505") throw insertError;

  const { error: promoteError } = await supabaseService
    .from(TABLE)
    .update({ status: "promoted", count, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("signal_key", canonical.key);
  if (promoteError) throw promoteError;

  return { status: "promoted", count, body };
};
