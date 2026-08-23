import { API_PATHS } from "@umbil/shared";

import { getPublicEnv } from "./env";
import { getSupabase } from "./supabase";

export type WeeklyTopic = { name: string; count: number };

export type WeeklySummaryData = {
  weekStart: string;
  weekEnd: string;
  isoWeekKey: string;
  alreadySeen: boolean;
  questionsAsked: number;
  learningLogged: number;
  activeDays: number;
  questionTopics: WeeklyTopic[];
  topQuestionTopic: string | null;
  loggedTopics: WeeklyTopic[];
  toolsUsed: number;
  toolsByType: WeeklyTopic[];
  encouragement: string;
};

const trimSlash = (url: string) => url.replace(/\/$/, "");

const authHeaders = async () => {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export async function fetchWeeklySummary(): Promise<WeeklySummaryData | null> {
  const { apiUrl } = getPublicEnv();
  const headers = await authHeaders();
  const res = await fetch(`${trimSlash(apiUrl)}${API_PATHS.weeklySummary}`, {
    headers,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Weekly summary request failed (${res.status}): ${body}`);
  }
  return (await res.json()) as WeeklySummaryData;
}

export async function dismissWeeklySummary(): Promise<void> {
  const { apiUrl } = getPublicEnv();
  const headers = await authHeaders();
  await fetch(`${trimSlash(apiUrl)}${API_PATHS.weeklySummary}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "dismiss" }),
  });
}
