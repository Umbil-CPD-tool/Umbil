import { NextResponse } from "next/server";

/**
 * Shared CORS handling for API routes the mobile app (Expo Router / React Native)
 * calls directly from the browser (mobile-web preview + native web builds), which
 * run on a different origin (e.g. http://localhost:8082) than this Next.js app
 * (e.g. https://umbil.co.uk). Native iOS/Android builds never hit CORS since it's
 * a browser-only enforcement mechanism, so this only matters for web contexts.
 *
 * Only apply this to routes that authenticate via a Bearer token in the
 * Authorization header (checked server-side, independent of CORS). CORS controls
 * which browser origins may *read* a response — it is not an auth mechanism —
 * so opening it on Bearer-token routes does not weaken security: a cross-origin
 * caller still needs a valid Supabase JWT to get anything but a 401 back.
 *
 * Do NOT apply this to cookie/session-authenticated routes.
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-device-id",
};

/** Use as `export const OPTIONS = corsPreflight;` in routes that need CORS. */
export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Merge CORS headers into a route's own response headers. */
export function withCors(headers: HeadersInit = {}): HeadersInit {
  return { ...headers, ...CORS_HEADERS };
}
