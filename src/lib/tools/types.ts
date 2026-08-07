/** Canonical tool identifiers shared by UI and API routes. */
export type ToolId =
  | "referral"
  | "safety_netting"
  | "digital_triage"
  | "discharge_summary"
  | "sbar"
  | "patient_friendly"
  | "translate_handout";

/** Tools surfaced in the chat tools modal / ask intent detection (excludes translate). */
export type ChatToolId = Exclude<ToolId, "translate_handout">;

export type ReferralMode = "quick" | "detailed";

export const CHAT_TOOL_IDS: ChatToolId[] = [
  "referral",
  "safety_netting",
  "digital_triage",
  "discharge_summary",
  "sbar",
  "patient_friendly",
];
