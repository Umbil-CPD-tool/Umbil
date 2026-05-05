// src/lib/store.ts
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

// 1. Add UsagePeriod type to fix TypeScript errors
export type UsagePeriod = 'daily' | 'monthly' | 'yearly';

// --- NEW: LIMIT ENFORCEMENT HELPER ---
export async function checkAndTrackUsage(userId: string, feature: string, limit: number, period: UsagePeriod): Promise<boolean> {
  // 1. Always allow Pro users (Check both fields just in case)
  const { data: profile } = await supabase.from('profiles').select('subscription_status, is_pro').eq('id', userId).single();
  if (profile?.subscription_status === 'active' || profile?.is_pro) return true;

  // 2. Fetch current usage
  const { data: usage } = await supabase.from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('feature', feature)
    .single();

  const now = new Date();
  let count = usage?.usage_count || 0;
  let lastReset = usage?.last_reset_date ? new Date(usage.last_reset_date) : new Date(0);

  // 3. Check if we need to reset the count based on the period
  let needsReset = false;
  if (period === 'daily') {
    needsReset = now.toDateString() !== lastReset.toDateString();
  } else if (period === 'monthly') {
    needsReset = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
  } else if (period === 'yearly') {
    needsReset = now.getFullYear() !== lastReset.getFullYear();
  }

  if (needsReset) {
    count = 0;
    lastReset = now;
  }

  // 4. Enforce the limit
  if (count >= limit) return false;

  // 5. Increment and save
  await supabase.from('usage_tracking').upsert({
    user_id: userId,
    feature,
    usage_count: count + 1,
    last_reset_date: lastReset.toISOString()
  }, { onConflict: 'user_id, feature' });

  return true;
}

// --- CPD Functions ---
export async function getAllLogs(): Promise<{ data: CPDEntry[]; error: PostgrestError | null }> {
  const cacheBuster = `cache-bust-${Date.now()}`; 

  const { data, error } = await supabase
    .from(CPD_TABLE)
    .select('*')
    .order("timestamp", { ascending: false })
    .neq('question', cacheBuster); 

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
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  
  if (!user) {
    console.error("addCPD: User not authenticated");
    return { 
      data: null, 
      error: { message: "User not authenticated. Please refresh or sign in again.", details: "", hint: "", code: "401" } as any 
    };
  }

  // --- UPDATED LIMIT CHECK: 10 per month ---
  const isAllowed = await checkAndTrackUsage(user.id, 'cpd', 10, 'monthly');
  if (!isAllowed) {
    return { data: null, error: { message: "LIMIT_REACHED" } as any };
  }
  // -------------------

  const payload = {
    user_id: user.id, 
    timestamp: new Date().toISOString(),
    question: entry.question,
    answer: entry.answer,
    reflection: entry.reflection || null, 
    tags: entry.tags || [],
    duration: entry.duration || 10
  };

  const { data, error } = await supabase.from(CPD_TABLE).insert(payload).select().single();
  return { data: data as CPDEntry | null, error };
}

// --- Table Constants ---
const CPD_TABLE = "cpd_entries";
const HISTORY_TABLE = "chat_history";
const ANALYTICS_TABLE = "app_analytics";
const PDP_TABLE = "pdp_goals";
const SURVEYS_TABLE = "psq_surveys";     
const RESPONSES_TABLE = "psq_responses"; 

// --- History & PDP Functions ---
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

// --- PSQ FUNCTIONS ---
export type PsqResponseRow = {
  id: string;
  survey_id: string;
  answers: Record<string, any>; 
  created_at: string;
};

export async function getPsqData(): Promise<{ responses: PsqResponseRow[]; surveyId: string | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { responses: [], surveyId: null, error: 'No user logged in' };

    const { data: survey, error: surveyError } = await supabase
      .from(SURVEYS_TABLE)
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (surveyError || !survey) {
      return { responses: [], surveyId: null, error: null };
    }

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

// --- DRAFT FUNCTIONS (SYNC) ---
export async function getDraft(toolId: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data } = await supabase
    .from('tool_drafts')
    .select('input_text')
    .eq('tool_id', toolId)
    .single();

  return data?.input_text || null;
}

export async function saveDraft(toolId: string, text: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { error } = await supabase
    .from('tool_drafts')
    .upsert({
      user_id: session.user.id,
      tool_id: toolId,
      input_text: text,
      last_updated: new Date().toISOString()
    });

  if (error) console.error("Error saving draft:", error);
}

export async function clearDraft(toolId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { error } = await supabase
    .from('tool_drafts')
    .delete()
    .eq('tool_id', toolId)
    .eq('user_id', session.user.id);

  if (error) console.error("Error clearing draft:", error);
}