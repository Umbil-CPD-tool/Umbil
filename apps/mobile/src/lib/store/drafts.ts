import { getSupabase } from "../supabase";

/** Serialize per-tool writes so an in-flight save cannot overwrite a later clear. */
const draftWriteChain = new Map<string, Promise<void>>();

const enqueueDraftWrite = (toolId: string, task: () => Promise<void>): Promise<void> => {
  const previous = draftWriteChain.get(toolId) ?? Promise.resolve();
  const next = previous.then(task, task);
  draftWriteChain.set(toolId, next);
  void next.finally(() => {
    if (draftWriteChain.get(toolId) === next) {
      draftWriteChain.delete(toolId);
    }
  });
  return next;
};

export async function getDraft(toolId: string): Promise<string | null> {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  if (!session?.user) return null;

  const { data } = await getSupabase()
    .from("tool_drafts")
    .select("input_text")
    .eq("tool_id", toolId)
    .single();

  const text = data?.input_text?.trim();
  return text || null;
}

export async function saveDraft(toolId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return clearDraft(toolId);
  }

  return enqueueDraftWrite(toolId, async () => {
    const {
      data: { session },
    } = await getSupabase().auth.getSession();
    if (!session?.user) return;

    const { error } = await getSupabase().from("tool_drafts").upsert({
      user_id: session.user.id,
      tool_id: toolId,
      input_text: trimmed,
      last_updated: new Date().toISOString(),
    });

    if (error) console.error("Error saving draft:", error);
  });
}

export async function clearDraft(toolId: string) {
  return enqueueDraftWrite(toolId, async () => {
    const {
      data: { session },
    } = await getSupabase().auth.getSession();
    if (!session?.user) return;

    const { error } = await getSupabase()
      .from("tool_drafts")
      .delete()
      .eq("tool_id", toolId)
      .eq("user_id", session.user.id);

    if (error) console.error("Error clearing draft:", error);
  });
}
