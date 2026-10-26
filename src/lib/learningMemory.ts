import { supabaseService } from "@/lib/supabaseService";
import { formatLearningContext, type LearningEntry, type LearningGoal } from "@umbil/shared";

const asTags = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((tag): tag is string => typeof tag === "string");
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
};

export const loadLearningPrompt = async (userId: string): Promise<string> => {
  const [goalsResult, entriesResult] = await Promise.all([
    supabaseService
      .from("pdp_goals")
      .select("title, timeline")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseService
      .from("cpd_entries")
      .select("question, tags, reflection")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(5),
  ]);

  if (goalsResult.error) throw goalsResult.error;
  if (entriesResult.error) throw entriesResult.error;

  const goals: LearningGoal[] = (goalsResult.data ?? []).map((row) => ({
    title: String(row.title ?? ""),
    timeline: row.timeline ? String(row.timeline) : null,
  }));
  const entries: LearningEntry[] = (entriesResult.data ?? []).map((row) => ({
    question: row.question ? String(row.question) : null,
    tags: asTags(row.tags),
    reflection: row.reflection ? String(row.reflection) : null,
  }));

  return formatLearningContext(goals, entries);
};
