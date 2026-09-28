import { supabase } from "@/lib/supabase";

const isWeekKey = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-W\d{2}$/.test(value);

export const loadStreakFreezeWeeks = async (): Promise<string[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("streak_freeze_weeks")
    .eq("id", user.id)
    .single();

  if (error || !data) return [];
  const value = (data as { streak_freeze_weeks?: unknown }).streak_freeze_weeks;
  return Array.isArray(value) ? value.filter(isWeekKey) : [];
};

export const saveStreakFreezeWeek = async (
  weekKey: string,
  current: readonly string[]
): Promise<string[]> => {
  if (!isWeekKey(weekKey)) throw new Error("That week cannot be frozen.");
  const next = current.includes(weekKey) ? [...current] : [...current, weekKey];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("profiles")
    .update({ streak_freeze_weeks: next })
    .eq("id", user.id);

  if (error) throw error;
  return next;
};
