import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // 1. Initialize the response
  // We start with a standard response that we might attach cookies to later
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Update the REQUEST cookies (so the immediate route handler sees the new session)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set({
              name,
              value,
            })
          );
          
          // 2. Re-create the response object with the updated request cookies
          response = NextResponse.next({
            request,
          });

          // 3. Update the RESPONSE cookies (so the browser persists the new session)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({
              name,
              value,
              ...options,
            })
          );
        },
      },
    }
  );

  // 2. Refresh session if necessary
  // This call is critical: it checks the DB/Auth server for validity
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Define Protected Routes
  const protectedPaths = [
    "/cpd",
    "/pdp",
    "/profile",
    "/settings",
  ];

  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // 4. Define Auth Routes
  const authPaths = ["/auth"];
  const isAuthPage = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // 5. Redirect Logic

  // CASE A: User is NOT logged in and tries to access a protected route
  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    // Capture the original destination
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    
    const myRedirect = NextResponse.redirect(redirectUrl);
    
    // Copy cookies to preserve session state (e.g. if we just cleared them)
    copyCookies(response, myRedirect);

    return myRedirect;
  }

  // CASE B: User IS logged in and tries to access /auth (Login page)
  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    
    const myRedirect = NextResponse.redirect(redirectUrl);
    
    // Copy cookies to preserve session state (e.g. if we just refreshed tokens)
    copyCookies(response, myRedirect);

    return myRedirect;
  }

  // CASE C: Allow through
  return response;
}

// Helper to ensure cookies travel with redirects
function copyCookies(source: NextResponse, target: NextResponse) {
  // Copy 'Set-Cookie' headers from source to target
  // This ensures that token refreshes or clearings are respected by the browser
  source.cookies.getAll().forEach((cookie) => {
    // FIX: Just pass the cookie object directly, as it already contains name, value, and options
    target.cookies.set(cookie);
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (svgs, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};