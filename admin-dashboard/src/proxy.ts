import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * proxy.ts — Route protection for Next.js 16
 *
 * Uses getSession() (cookie-based, zero network calls) instead of getUser()
 * to avoid hammering Supabase on every request and causing RAM overuse.
 *
 * FIX: /api/ routes are excluded from matcher to prevent unnecessary
 * Supabase client instantiation on every proxied backend call.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/update-password");

  // Skip middleware for auth callback
  const isAuthCallback = pathname.startsWith("/auth");

  let supabaseResponse = NextResponse.next({ request });

  // Only run auth check on actual page routes, not API/assets
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ✅ getSession() reads the JWT from cookie — NO network request to Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isLoggedIn = !!session?.user;

  // Unauthenticated → send to login (except for auth callback and login/register pages)
  if (!isLoggedIn && !isAuthRoute && !isAuthCallback) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already logged in → don't show login/register/forgot-password, redirect to home
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  supabaseResponse.headers.set("x-current-path", pathname);
  return supabaseResponse;
}

export const config = {
  /**
   * FIX: Exclude /api/ from middleware — those requests are proxied to the
   * Python backend (next.config.ts rewrites) and don't need auth middleware.
   * Previously matcher included /api/ causing a new Supabase client to spawn
   * on every analytics/faq/handoff fetch → memory leak accumulation.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)).*)",
  ],
};
