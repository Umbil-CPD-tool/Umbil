import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ MISSING ENV VARS: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY is missing.");
  throw new Error('Supabase URL or Service Key is not set in environment variables.');
}

// Note: This client has admin privileges (bypasses RLS).
// ONLY use it in server-side code (like API routes).
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});