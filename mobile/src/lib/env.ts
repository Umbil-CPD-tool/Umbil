function requirePublicEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy mobile/.env.example to mobile/.env and add the public value.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: requirePublicEnv(
    'EXPO_PUBLIC_SUPABASE_URL',
    process.env.EXPO_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: requirePublicEnv(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  apiBaseUrl: requirePublicEnv(
    'EXPO_PUBLIC_API_BASE_URL',
    process.env.EXPO_PUBLIC_API_BASE_URL,
  ).replace(/\/+$/, ''),
} as const;
