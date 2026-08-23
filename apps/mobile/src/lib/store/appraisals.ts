import { getSupabase } from "../supabase";

export type PsqSurvey = {
  id: string;
  user_id: string;
  title: string | null;
  required_responses: number | null;
  created_at: string;
  custom_questions?: string[] | null;
  executive_summary?: string | null;
  psq_responses?: { count: number }[];
};

export type MsfCycle = {
  id: string;
  user_id: string;
  title: string | null;
  status: string | null;
  required_responses: number | null;
  created_at: string;
  custom_questions?: string[] | null;
  ai_summary?: string | null;
  msf_responses?: { count: number }[];
};

/** Raw `psq_responses` row — used client-side by `calculateAnalytics` once the anonymity threshold is met. */
export type PsqResponseRow = {
  id?: string;
  answers?: Record<string, unknown> | null;
  created_at?: string;
};

/** Raw `msf_responses` row — used client-side by `calculateMsfAnalytics` once the anonymity threshold is met. */
export type MsfResponseRow = {
  id?: string;
  scores?: Record<string, unknown> | null;
  role_type?: string | null;
  strengths_text?: string | null;
  example_text?: string | null;
  improvements_text?: string | null;
  additional_comments?: string | null;
  created_at?: string;
};

/** `getPsqSurvey` return shape — full response rows so results/charts can be computed on-device. */
export type PsqSurveyWithResponses = Omit<PsqSurvey, "psq_responses"> & {
  psq_responses: PsqResponseRow[];
};

/** `getMsfCycle` return shape — full response rows so results/charts can be computed on-device. */
export type MsfCycleWithResponses = Omit<MsfCycle, "msf_responses"> & {
  msf_responses: MsfResponseRow[];
};

export async function listPsqSurveys(): Promise<PsqSurvey[]> {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  if (!user) return [];

  const { data, error } = await getSupabase()
    .from("psq_surveys")
    .select("*, psq_responses(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }
  return (data as PsqSurvey[]) || [];
}

export async function createPsqSurvey(title: string, requiredResponses = 34) {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  if (!user) return { data: null, error: { message: "Not signed in" } };

  const { data, error } = await getSupabase()
    .from("psq_surveys")
    .insert({
      user_id: user.id,
      title,
      required_responses: requiredResponses,
    })
    .select()
    .single();

  return { data, error };
}

export async function deletePsqSurvey(id: string) {
  return getSupabase().from("psq_surveys").delete().eq("id", id);
}

export async function getPsqSurvey(id: string) {
  const { data, error } = await getSupabase()
    .from("psq_surveys")
    .select("*, psq_responses(id, answers, created_at)")
    .eq("id", id)
    .single();
  return { data: data as PsqSurveyWithResponses | null, error };
}

export async function listMsfCycles(): Promise<MsfCycle[]> {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  if (!user) return [];

  const { data, error } = await getSupabase()
    .from("msf_cycles")
    .select("*, msf_responses(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }
  return (data as MsfCycle[]) || [];
}

export async function createMsfCycle(title: string, requiredResponses = 15) {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  if (!user) return { data: null, error: { message: "Not signed in" } };

  const { data, error } = await getSupabase()
    .from("msf_cycles")
    .insert({
      user_id: user.id,
      title,
      required_responses: requiredResponses,
      status: "open",
    })
    .select()
    .single();

  return { data, error };
}

export async function deleteMsfCycle(id: string) {
  return getSupabase().from("msf_cycles").delete().eq("id", id);
}

export async function getMsfCycle(id: string) {
  const { data, error } = await getSupabase()
    .from("msf_cycles")
    .select("*, msf_responses(*)")
    .eq("id", id)
    .single();
  return { data: data as MsfCycleWithResponses | null, error };
}

export async function updatePsqCustomQuestions(
  id: string,
  customQuestions: string[]
) {
  return getSupabase()
    .from("psq_surveys")
    .update({ custom_questions: customQuestions.slice(0, 2) })
    .eq("id", id);
}

/** Persists the AI-generated executive summary so it's cached and not regenerated on every visit (mirrors web `ResultsReflectionTab`). */
export async function updatePsqExecutiveSummary(id: string, executiveSummary: string) {
  return getSupabase()
    .from("psq_surveys")
    .update({ executive_summary: executiveSummary })
    .eq("id", id);
}

export async function updateMsfCustomQuestions(
  id: string,
  customQuestions: string[]
) {
  return getSupabase()
    .from("msf_cycles")
    .update({ custom_questions: customQuestions.slice(0, 2) })
    .eq("id", id);
}
