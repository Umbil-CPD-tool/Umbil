import { supabaseService } from "@/lib/supabaseService";
import {
  formatContinuityBlock,
  mergeConversationNote,
  selectRelatedNotes,
  type ConversationNote,
} from "@umbil/shared";

const TABLE = "conversation_notes";

type NoteRow = {
  conversation_id: string;
  title: string;
  summary: string;
  updated_at: string;
};

const toNote = (row: NoteRow): ConversationNote => ({
  conversationId: row.conversation_id,
  title: row.title,
  summary: row.summary,
  updatedAt: row.updated_at,
});

const listNotes = async (userId: string): Promise<ConversationNote[]> => {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select("conversation_id, title, summary, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return ((data ?? []) as NoteRow[]).map(toNote);
};

export const loadContinuityBlock = async (
  userId: string,
  conversationId: string | null,
  message: string
): Promise<string> => {
  const notes = await listNotes(userId);
  const current = conversationId ? notes.find((note) => note.conversationId === conversationId) ?? null : null;
  const related = selectRelatedNotes(message, notes.filter((note) => note.conversationId !== conversationId));
  return formatContinuityBlock(current, related);
};

export const saveConversationTurn = async (
  userId: string,
  conversationId: string,
  question: string,
  answer: string
): Promise<void> => {
  const { data: existing, error: readError } = await supabaseService
    .from(TABLE)
    .select("title, summary")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (readError) throw readError;

  const merged = mergeConversationNote(
    existing ? { title: String(existing.title ?? ""), summary: String(existing.summary ?? "") } : null,
    question,
    answer
  );
  if (!merged) return;

  const { error } = await supabaseService.from(TABLE).upsert(
    {
      user_id: userId,
      conversation_id: conversationId,
      title: merged.title,
      summary: merged.summary,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,conversation_id" }
  );
  if (error) throw error;
};
