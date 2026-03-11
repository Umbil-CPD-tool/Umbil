import { createBrowserClient } from '@supabase/ssr';

// This client automatically handles cookie persistence for your Next.js app.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          cache: 'no-store', // Forces Next.js Router & Proxy to skip cache
          headers: {
            ...options?.headers,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      },
    },
  }
);