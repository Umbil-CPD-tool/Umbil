import type { ChatConversation, ChatHistoryItem } from "@umbil/shared";

import { getSupabase } from "../supabase";

const HISTORY_TABLE = "chat_history";

export async function getChatHistory(): Promise<ChatConversation[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_user_conversations");
  if (!error && Array.isArray(data) && data.length > 0) {
    return data as ChatConversation[];
  }

  const { data: rawData, error: rawError } = await supabase
    .from(HISTORY_TABLE)
    .select("conversation_id, question, created_at")
    .order("created_at", { ascending: true });

  if (rawError) {
    console.error("[getChatHistory]", rawError);
    return [];
  }

  const byId = new Map<string, ChatConversation>();
  for (const row of rawData ?? []) {
    if (!row.conversation_id) continue;
    const existing = byId.get(row.conversation_id);
    if (!existing) {
      byId.set(row.conversation_id, {
        conversation_id: row.conversation_id,
        first_question: row.question,
        last_active: row.created_at,
      });
    } else {
      existing.last_active = row.created_at;
    }
  }

  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.last_active).getTime() - new Date(a.last_active).getTime()
  );
}

export async function getConversationMessages(
  conversationId: string
): Promise<ChatHistoryItem[]> {
  const { data, error } = await getSupabase()
    .from(HISTORY_TABLE)
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return error ? [] : (data as ChatHistoryItem[]);
}
