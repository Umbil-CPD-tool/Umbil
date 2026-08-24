import Constants from "expo-constants";

type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiUrl: string;
};

const read = (key: string): string => {
  const fromProcess = process.env[key];
  if (fromProcess && fromProcess.length > 0) return fromProcess;

  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  const fromExtra = extra?.[key];
  if (fromExtra && fromExtra.length > 0) return fromExtra;

  return "";
};

export const getPublicEnv = (): PublicEnv => {
  const supabaseUrl = read("EXPO_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = read("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  const apiUrl = read("EXPO_PUBLIC_API_URL") || "http://localhost:3000";

  return { supabaseUrl, supabaseAnonKey, apiUrl };
};

export const assertPublicEnv = (): PublicEnv => {
  const env = getPublicEnv();
  const missing: string[] = [];

  if (!env.supabaseUrl) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!env.supabaseAnonKey) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing env: ${missing.join(", ")}. Copy apps/mobile/.env.example to apps/mobile/.env`
    );
  }

  return env;
};
