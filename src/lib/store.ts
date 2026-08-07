/** Barrel re-exports — existing `from "@/lib/store"` imports keep working. */

export type {
  CPDEntry,
  PDPGoal,
  ChatHistoryItem,
  ChatConversation,
  UsagePeriod,
} from "./store/types";

export { checkAndTrackUsage, getDeviceId } from "./store/usage";
export { getAllLogs, getCPD, deleteCPD, updateCPD, addCPD } from "./store/cpd";
export { getPDP, addPDP, deletePDP, clearAll } from "./store/pdp";
export { getChatHistory, getConversationMessages } from "./store/chat";
export { getDraft, saveDraft, clearDraft } from "./store/drafts";
