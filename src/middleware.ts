import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) =>
            // FIX: Pass arguments as a single object to satisfy TypeScript
            request.cookies.set({
              name,
              value,
              ...options,
            })
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 1. Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Define Protected Routes
  const protectedPaths = [
    "/cpd",
    "/pdp",
    "/profile",
    "/settings",
  ];

  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // 3. Define Auth Routes
  const authPaths = ["/auth"];
  const isAuthPage = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // 4. Redirect Logic
  
  // CASE A: User is NOT logged in and tries to access a protected route
  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    // ADDED: Capture the original destination to bounce them back later
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    
    const myRedirect = NextResponse.redirect(redirectUrl);
    
    // Copy cookies to preserve session state/clearing
    response.cookies.getAll().forEach((cookie) => {
      myRedirect.cookies.set(cookie.name, cookie.value, cookie);
    });

    return myRedirect;
  }

  // CASE B: User IS logged in and tries to access /auth (Login page)
  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    
    const myRedirect = NextResponse.redirect(redirectUrl);
    
    response.cookies.getAll().forEach((cookie) => {
      myRedirect.cookies.set(cookie.name, cookie.value, cookie);
    });

    return myRedirect;
  }

  // CASE C: Landing Page (/) and other public routes -> Allow through
  return response;
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