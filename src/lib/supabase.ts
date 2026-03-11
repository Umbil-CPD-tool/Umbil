import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: {
      fetch: (url, options) => {
        let finalUrl = url instanceof Request ? url.url : url.toString();
        
        // --- THE SMART CACHE BUSTER ---
        // We append a unique timestamp to the URL of all data requests. 
        // This forces the NHS proxy to bypass its cache without ruining DB performance.
        // We explicitly skip Auth requests to prevent breaking the login flow.
        if (finalUrl.includes('/rest/v1/') && (!options?.method || options.method === 'GET')) {
          const separator = finalUrl.includes('?') ? '&' : '?';
          finalUrl = `${finalUrl}${separator}cb=${Date.now()}`;
        }

        return fetch(finalUrl, {
          ...options,
          cache: 'no-store', 
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