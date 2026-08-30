// src/lib/askIntentLlm.ts
// Fallback when the keyword matcher is unsure. Only called for command-like messages
// so ordinary clinical lookups do not pay an extra model hop.

import { generateText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { CHAT_TOOL_IDS } from "@/lib/tools/types";
import { type AskIntent } from "@/lib/askIntent";

const API_KEY = process.env.TOGETHER_API_KEY;
const together = API_KEY ? createTogetherAI({ apiKey: API_KEY }) : null;
const CLASSIFY_MODEL = process.env.INTENT_MODEL || "openai/gpt-oss-120b";

const VALID = new Set<AskIntent>([...CHAT_TOOL_IDS, "standard", "capture_learning"]);

const CLASSIFY_PROMPT = `
You route one clinician message for Umbil. Reply with JSON only:
{"intent":"<one>"}

Allowed intent values:
- referral — they want a referral letter drafted
- safety_netting — they want a safety-netting note for the record
- digital_triage — they want a reply to send back to a patient (e-consult / AccuRx)
- discharge_summary — they want a discharge / TTO letter
- sbar — they want an SBAR handover
- patient_friendly — they want a patient leaflet / plain-English explanation FOR THE PATIENT
- capture_learning — they want to save this case to their CPD / learning log
- standard — a clinical question, criteria question, or anything else

Default to standard unless they are clearly asking you to produce that document or save learning.
"how do I explain X" and "when should I refer" are standard, not tools.
`.trim();

const readIntent = (text: string): AskIntent => {
  const match = text.match(/"intent"\s*:\s*"([a-z_]+)"/i);
  const value = (match?.[1] ?? "").toLowerCase() as AskIntent;
  return VALID.has(value) ? value : "standard";
};

export const classifyAskIntent = async (userMessage: string): Promise<AskIntent> => {
  if (!together || !userMessage.trim()) return "standard";

  try {
    const { text } = await generateText({
      model: together(CLASSIFY_MODEL),
      messages: [
        { role: "system", content: CLASSIFY_PROMPT },
        { role: "user", content: userMessage.slice(0, 1500) },
      ],
      temperature: 0,
      maxOutputTokens: 40,
    });

    return readIntent(text ?? "");
  } catch (error) {
    console.error("[Umbil] Intent classifier failed:", error);
    return "standard";
  }
};
