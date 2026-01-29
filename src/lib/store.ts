import { supabase } from "@/lib/supabase";
import { type PostgrestError } from "@supabase/supabase-js";

// --- Existing Types ---
export type CPDEntry = {
  id?: string; 
  user_id?: string;
  timestamp: string;
  question: string;
  answer: string;
  reflection?: string;
  tags?: string[];
  duration?: number; 
};

export type PDPGoal = {
  id: string;
  user_id?: string; 
  title: string;
  timeline: string;
  activities: string[];
  created_at?: string; 
};

export type ChatHistoryItem = {
  id: string;
  conversation_id?: string;
  question: string;
  answer?: string; 
  created_at: string;
};

export type ChatConversation = {
  conversation_id: string;
  first_question: string;
  last_active: string;
};

// --- Table Constants ---
const CPD_TABLE = "cpd_entries";
const HISTORY_TABLE = "chat_history";
const ANALYTICS_TABLE = "app_analytics";
const PDP_TABLE = "pdp_goals";
const SURVEYS_TABLE = "psq_surveys";     // Matches your SQL
const RESPONSES_TABLE = "psq_responses"; // Matches your SQL

// --- CPD Functions (Kept as is) ---
export async function getAllLogs(): Promise<{ data: CPDEntry[]; error: PostgrestError | null }> {
  const { data, error } = await supabase.from(CPD_TABLE).select('*').order("timestamp", { ascending: false });
  if (error) console.error("Error fetching logs:", error);
  return { data: (data as CPDEntry[]) || [], error };
}

export async function getCPD(): Promise<CPDEntry[]> {
  const { data, error } = await supabase.from(CPD_TABLE).select("timestamp, tags, duration").order("timestamp", { ascending: false });
  return error ? [] : data as CPDEntry[]; 
}

export async function deleteCPD(id: string) {
  const { error } = await supabase.from(CPD_TABLE).delete().eq('id', id);
  return { error };
}

export async function updateCPD(id: string, updates: Partial<CPDEntry>) {
  const { error } = await supabase.from(CPD_TABLE).update(updates).eq('id', id);
  return { error };
}

export async function addCPD(entry: Omit<CPDEntry, 'id' | 'user_id'>) {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch (e) {}

  const payload = {
    timestamp: entry.timestamp,
    question: entry.question,
    answer: entry.answer,
    reflection: entry.reflection || null, 
    tags: entry.tags || [],
    duration: entry.duration || 10,
    ...(userId && { user_id: userId })
  };

  const { data, error } = await supabase.from(CPD_TABLE).insert(payload).select().single();
  return { data: data as CPDEntry | null, error };
}

// --- History & PDP Functions (Kept as is) ---
export async function getChatHistory(): Promise<ChatConversation[]> {
  const { data, error } = await supabase.rpc('get_user_conversations');
  if (!error && data) return data as ChatConversation[];
  return []; 
}

export async function getConversationMessages(conversationId: string): Promise<ChatHistoryItem[]> {
  const { data, error } = await supabase.from(HISTORY_TABLE).select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
  return error ? [] : data as ChatHistoryItem[];
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server-side';
  let id = localStorage.getItem('umbil_device_id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `device_${Date.now()}`;
    localStorage.setItem('umbil_device_id', id);
  }
  return id;
}

export async function getPDP(): Promise<PDPGoal[]> {
  const { data, error } = await supabase.from(PDP_TABLE).select("*").order("created_at", { ascending: false });
  return error ? [] : data as PDPGoal[];
}

export async function addPDP(goal: Omit<PDPGoal, 'id' | 'user_id'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "No user", code: "401", details: "", hint: "", name: "AuthError" } };
  const { data, error } = await supabase.from(PDP_TABLE).insert({ user_id: user.id, ...goal }).select().single();
  return { data: data as PDPGoal | null, error };
}

export async function deletePDP(id: string) {
  const { error } = await supabase.from(PDP_TABLE).delete().eq('id', id);
  return { error };
}

export function clearAll() {
  if (typeof window !== "undefined") {
      localStorage.removeItem("cpd_log"); 
      localStorage.removeItem("pdp_goals");
  }
}

// --- NEW PSQ FUNCTIONS (Matching your SQL) ---

export type PsqResponseRow = {
  id: string;
  survey_id: string;
  answers: Record<string, any>; // The JSONB column
  created_at: string;
};

export async function getPsqData(): Promise<{ responses: PsqResponseRow[]; surveyId: string | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { responses: [], surveyId: null, error: 'No user logged in' };

    // 1. Find the User's Active Survey
    const { data: survey, error: surveyError } = await supabase
      .from(SURVEYS_TABLE)
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (surveyError || !survey) {
      // It's not necessarily an error, just means no survey started yet
      return { responses: [], surveyId: null, error: null };
    }

    // 2. Fetch all responses linked to this survey
    const { data: responses, error: responseError } = await supabase
      .from(RESPONSES_TABLE)
      .select('*')
      .eq('survey_id', survey.id);

    if (responseError) {
      console.error("Error fetching responses:", responseError);
      return { responses: [], surveyId: survey.id, error: responseError };
    }

    return { responses: (responses as PsqResponseRow[]) || [], surveyId: survey.id, error: null };
  } catch (e) {
    return { responses: [], surveyId: null, error: e };
  }
}