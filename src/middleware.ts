import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // 1. Initialize the response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // --- CRITICAL FIX: ANTI-CACHING FOR NHS PROXIES ---
  // Tells strict institutional proxies NEVER to cache this route's auth decision
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Update the REQUEST cookies
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set({ name, value })
          );
          
          // 2. Re-create the response object
          response = NextResponse.next({ request });
          
          // Re-apply headers to the newly created response object
          response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          response.headers.set('Pragma', 'no-cache');
          response.headers.set('Expires', '0');

          // 3. Update the RESPONSE cookies
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedPaths = ["/cpd", "/pdp", "/profile", "/settings"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  const authPaths = ["/auth"];
  const isAuthPage = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    
    const myRedirect = NextResponse.redirect(redirectUrl);
    
    // Explicitly apply anti-caching to the redirect so proxies don't cache the "boot to login" action
    myRedirect.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    myRedirect.headers.set('Pragma', 'no-cache');
    myRedirect.headers.set('Expires', '0');
    
    copyCookies(response, myRedirect);
    return myRedirect;
  }

  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    
    const myRedirect = NextResponse.redirect(redirectUrl);
    
    myRedirect.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    myRedirect.headers.set('Pragma', 'no-cache');
    myRedirect.headers.set('Expires', '0');

    copyCookies(response, myRedirect);
    return myRedirect;
  }

  return response;
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};