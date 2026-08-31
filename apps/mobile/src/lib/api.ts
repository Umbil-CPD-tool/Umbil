import { fetch as expoFetch } from "expo/fetch";
import type { AnswerStyle } from "@umbil/shared";
import { API_PATHS } from "@umbil/shared";
import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";

import { getPublicEnv } from "./env";
import { getDeviceId } from "./ids";
import { getSupabase } from "./supabase";
import type { Profile } from "./profile";
import { readTextStream } from "./stream";

export const NO_STRIPE_BILLING_MESSAGE =
  "Your Pro access isn't billed through Stripe (for example a student .ac.uk unlock). There's no card to manage.";

export const isNoBillingProfileError = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /no billing profile found/i.test(message);
};

type JsonBody = { error?: string; url?: string };

const readJsonBody = async (response: Response): Promise<JsonBody> => {
  try {
    return (await response.json()) as JsonBody;
  } catch {
    return {};
  }
};

export const openExternalUrl = async (url: string) => {
  try {
    await Linking.openURL(url);
  } catch {
    await WebBrowser.openBrowserAsync(url);
  }
};

const trimSlash = (url: string) => url.replace(/\/$/, "");

const streamHeaders = async (extra: Record<string, string> = {}) => {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  return {
    Accept: "text/plain",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
};

const authHeaders = async (extra: Record<string, string> = {}) => {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  return {
    Accept: "text/plain, application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
};

export async function streamAsk(params: {
  messages: { role: "user" | "assistant"; content: string }[];
  profile: Profile | null;
  answerStyle: AnswerStyle;
  conversationId: string | null;
  onChunk: (text: string) => void;
}) {
  const { apiUrl } = getPublicEnv();
  const deviceId = await getDeviceId();
  const headers = await streamHeaders({ "x-device-id": deviceId });

  const response = await expoFetch(`${trimSlash(apiUrl)}${API_PATHS.ask}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages: params.messages,
      profile: params.profile,
      answerStyle: params.answerStyle,
      conversationId: params.conversationId,
      saveToHistory: true,
    }),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const json = (await response.json()) as { error?: string };
      throw new Error(json.error || `Ask failed (${response.status})`);
    }
    throw new Error(await response.text());
  }

  if (contentType.includes("application/json")) {
    const json = (await response.json()) as { answer?: string };
    const answer = json.answer ?? "";
    params.onChunk(answer);
    return answer;
  }

  return readTextStream(response, params.onChunk);
}

export async function streamTool(params: {
  toolType: string;
  input: string;
  signerName?: string | null;
  signerRole?: string | null;
  referralMode?: "quick" | "detailed";
  targetLanguage?: string;
  onChunk: (text: string) => void;
}) {
  const { apiUrl } = getPublicEnv();
  const headers = await streamHeaders();

  const response = await expoFetch(`${trimSlash(apiUrl)}${API_PATHS.tools}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      toolType: params.toolType,
      input: params.input,
      signerName: params.signerName,
      signerRole: params.signerRole,
      referralMode: params.referralMode ?? "detailed",
      ...(params.targetLanguage
        ? { targetLanguage: params.targetLanguage }
        : {}),
    }),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const json = await response.json();
      throw new Error(json.error || `Tools failed (${response.status})`);
    }
    throw new Error(await response.text());
  }

  return readTextStream(response, params.onChunk);
}

export async function streamReflection(params: {
  body: Record<string, unknown>;
  onChunk: (text: string) => void;
}) {
  const { apiUrl } = getPublicEnv();
  const headers = await streamHeaders();

  const response = await expoFetch(
    `${trimSlash(apiUrl)}${API_PATHS.generateReflection}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(params.body),
    }
  );

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const json = await response.json();
      throw new Error(json.error || `Reflection failed (${response.status})`);
    }
    throw new Error(await response.text());
  }

  return readTextStream(response, params.onChunk);
}

export async function startCheckout(priceId: string, planType: string) {
  const { apiUrl } = getPublicEnv();
  const headers = await authHeaders({ Accept: "application/json" });
  const response = await fetch(`${trimSlash(apiUrl)}${API_PATHS.stripeCheckout}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ priceId, planType }),
  });
  const json = await readJsonBody(response);
  if (!response.ok) throw new Error(json.error || "Checkout failed");
  return json as { url?: string };
}

export async function getUserStats() {
  const { apiUrl } = getPublicEnv();
  const headers = await authHeaders({ Accept: "application/json" });
  const response = await fetch(`${trimSlash(apiUrl)}${API_PATHS.userStats}`, {
    headers,
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "Failed to load stats");
  return json as { questions: number; tools: number; captures: number };
}

export async function openBillingPortal() {
  const { apiUrl } = getPublicEnv();
  const headers = await authHeaders({ Accept: "application/json" });
  const response = await fetch(`${trimSlash(apiUrl)}${API_PATHS.stripePortal}`, {
    method: "POST",
    headers,
  });
  const json = await readJsonBody(response);
  if (!response.ok) throw new Error(json.error || "Portal failed");
  return json as { url?: string };
}

export async function deleteAccount() {
  const { apiUrl } = getPublicEnv();
  const headers = await authHeaders({ Accept: "application/json" });
  const response = await fetch(`${trimSlash(apiUrl)}${API_PATHS.deleteAccount}`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error || "Delete failed");
  }
}

export async function reportContent(params: {
  question: string;
  answer: string;
  reason: string;
}) {
  const { apiUrl } = getPublicEnv();
  const headers = await authHeaders({ Accept: "application/json" });
  const response = await fetch(`${trimSlash(apiUrl)}${API_PATHS.report}`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error || "Report failed");
  }
}
