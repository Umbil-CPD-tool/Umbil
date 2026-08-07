import { supabase } from "@/lib/supabase";

export async function getDraft(toolId: string): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data } = await supabase
    .from("tool_drafts")
    .select("input_text")
    .eq("tool_id", toolId)
    .single();

  return data?.input_text || null;
}

export async function saveDraft(toolId: string, text: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { error } = await supabase.from("tool_drafts").upsert({
    user_id: session.user.id,
    tool_id: toolId,
    input_text: text,
    last_updated: new Date().toISOString(),
  });

  if (error) console.error("Error saving draft:", error);
}

export async function clearDraft(toolId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { error } = await supabase
    .from("tool_drafts")
    .delete()
    .eq("tool_id", toolId)
    .eq("user_id", session.user.id);

  if (error) console.error("Error clearing draft:", error);
}
