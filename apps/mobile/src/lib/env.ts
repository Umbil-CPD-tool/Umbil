import Constants from "expo-constants";

type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiUrl: string;
};

const fromExtra = (key: string): string => {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  const value = extra?.[key];
  return value && value.length > 0 ? value : "";
};

export const getPublicEnv = (): PublicEnv => {
  // EXPO_PUBLIC_* variables must be read with static member expressions so
  // Metro inlines them into the production bundle. A dynamic
  // `process.env[key]` lookup is not inlined and always returns "" in a
  // store build, which made AuthProvider throw "Missing env" on launch.
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL || fromExtra("EXPO_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    fromExtra("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    fromExtra("EXPO_PUBLIC_API_URL") ||
    "http://localhost:3000";

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
