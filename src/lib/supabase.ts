import { createBrowserClient } from '@supabase/ssr';

// This client automatically handles cookie persistence for your Next.js app.
// It allows the client-side session to be shared with the Server Middleware.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);