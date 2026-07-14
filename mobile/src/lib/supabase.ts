import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { secureStorageAdapter } from '@/lib/storage';

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
