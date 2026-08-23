import { getSupabase } from "../supabase";

export type ToolHistoryRow = {
  id: string;
  tool_id: string;
  tool_name: string;
  input: string;
  output: string;
  created_at: string;
};

export async function getToolHistory(limit = 5): Promise<ToolHistoryRow[]> {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  if (!user) return [];

  const { data, error } = await getSupabase()
    .from("tool_history")
    .select("id, tool_id, tool_name, input, output, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(error);
    return [];
  }
  return (data as ToolHistoryRow[]) || [];
}
