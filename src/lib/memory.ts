// src/lib/memory.ts
import { generateText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { supabaseService } from "@/lib/supabaseService";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import {
  MemoryCandidate,
  MemorySkipReason,
  hasSelfReferenceSignal,
  parseMemoryResponse,
  truncateMessage,
  validateMemoryCandidate,
} from "@/lib/memoryRules";

const API_KEY = process.env.TOGETHER_API_KEY!;
const together = createTogetherAI({ apiKey: API_KEY });

// Must be a model Together actually serves serverless. Qwen2.5-7B-Instruct-Turbo went
// dedicated-only and every consolidation silently failed, so memory stopped saving entirely.
// Override with MEMORY_MODEL if this one is ever retired too.
export const MEMORY_MODEL = process.env.MEMORY_MODEL || "openai/gpt-oss-120b";

const RETRY_NUDGE =
  'Your previous reply was not valid JSON. Reply again with the JSON object only — no prose, no markdown fences. Schema: {"reasoning": string, "memory": string, "update_required": boolean}';

export type MemoryOutcome =
  | { status: "saved"; memory: string }
  | {
      status: "skipped";
      reason: MemorySkipReason | "missing_input" | "no_self_reference" | "no_profile_row" | "write_conflict";
    }
  | { status: "failed"; reason: "profile_read_failed" | "model_error" | "write_failed" | "unexpected_error" };

const buildMessages = (currentMemory: string | null, message: string) => [
  { role: "system" as const, content: SYSTEM_PROMPTS.MEMORY_CONSOLIDATOR },
  {
    role: "user" as const,
    content: `CURRENT MEMORY:\n${currentMemory || "None"}\n\nNEW USER MESSAGE:\n"${message}"`,
  },
];

/** One retry with a stricter nudge — a single malformed reply used to lose the update outright. */
const generateCandidate = async (
  currentMemory: string | null,
  message: string
): Promise<MemoryCandidate | null> => {
  const base = buildMessages(currentMemory, message);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const messages = attempt === 0 ? base : [...base, { role: "user" as const, content: RETRY_NUDGE }];

    const { text } = await generateText({
      model: together(MEMORY_MODEL),
      messages,
      temperature: attempt === 0 ? 0.1 : 0,
      maxOutputTokens: 500,
    });

    const parsed = parseMemoryResponse(text);
    if (parsed) return parsed;

    console.warn(`[Umbil Memory] Unparsable consolidator output (attempt ${attempt + 1}):`, text?.slice(0, 300));
  }

  return null;
};

/**
 * Consolidates the latest user message into the stored professional profile.
 * Reads the memory fresh and writes it back conditionally, so a manual profile edit
 * or a parallel chat turn can never be silently overwritten by a stale snapshot.
 */
export async function updateMemory(userId: string | null, lastUserMessage: string): Promise<MemoryOutcome> {
  if (!userId || !lastUserMessage?.trim()) {
    console.log("[Umbil Memory] Skipped: No userId or message.");
    return { status: "skipped", reason: "missing_input" };
  }

  if (!hasSelfReferenceSignal(lastUserMessage)) {
    return { status: "skipped", reason: "no_self_reference" };
  }

  try {
    const { data: profile, error: readError } = await supabaseService
      .from("profiles")
      .select("custom_instructions")
      .eq("id", userId)
      .maybeSingle();

    if (readError) {
      console.error("[Umbil Memory] Profile read error:", readError);
      return { status: "failed", reason: "profile_read_failed" };
    }

    if (!profile) {
      console.log(`[Umbil Memory] Skipped: no profile row for user ${userId}.`);
      return { status: "skipped", reason: "no_profile_row" };
    }

    const currentMemory: string | null = profile.custom_instructions ?? null;

    let candidate: MemoryCandidate | null;
    try {
      candidate = await generateCandidate(currentMemory, truncateMessage(lastUserMessage));
    } catch (modelError) {
      console.error("[Umbil Memory] Consolidator model error:", modelError);
      return { status: "failed", reason: "model_error" };
    }

    const verdict = validateMemoryCandidate(candidate, currentMemory);
    if (!verdict.ok) {
      console.log(`[Umbil Memory] No write for user ${userId} (${verdict.reason}).`);
      return { status: "skipped", reason: verdict.reason };
    }

    // Optimistic write: only replace the exact value we consolidated from.
    const baseQuery = supabaseService
      .from("profiles")
      .update({ custom_instructions: verdict.memory })
      .eq("id", userId);

    const guardedQuery =
      currentMemory === null
        ? baseQuery.is("custom_instructions", null)
        : baseQuery.eq("custom_instructions", currentMemory);

    const { data: updatedRows, error: writeError } = await guardedQuery.select("id");

    if (writeError) {
      console.error("[Umbil Memory] DB Update Error:", writeError);
      return { status: "failed", reason: "write_failed" };
    }

    if (!updatedRows?.length) {
      console.log(`[Umbil Memory] Write skipped for user ${userId}: memory changed elsewhere.`);
      return { status: "skipped", reason: "write_conflict" };
    }

    console.log(`[Umbil Memory] Successfully updated for user ${userId}`);
    return { status: "saved", memory: verdict.memory };
  } catch (error) {
    console.error("[Umbil Memory] Failed to update memory:", error);
    // Non-blocking error - we don't want to crash the chat if memory fails
    return { status: "failed", reason: "unexpected_error" };
  }
}
