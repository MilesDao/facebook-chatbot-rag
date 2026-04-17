/**
 * supabase.ts — Centralized Supabase client factory
 *
 * Two clients needed in Next.js App Router:
 *   1. createBrowserClient() → for "use client" components (reads cookies from browser)
 *   2. createServerClient()  → for Server Components & middleware (reads cookies from headers)
 *
 * FIX (RAM leak): Browser client is now a singleton. Previously each call to
 * createClient() spawned a new @supabase/ssr instance with its own internal
 * Realtime WebSocket and event-listener tree, which were never disposed → RAM leak.
 */

import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import { createServerClient as _createServerClient, type CookieOptions } from "@supabase/ssr";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Browser Supabase client — singleton to prevent memory leak.
 *
 * Singleton is safe here because the browser session is stored in httpOnly
 * cookies (managed by Supabase SSR), not in the client object itself.
 * The server-side client (createServerSupabaseClient) must NOT be a singleton
 * since it reads per-request cookie stores.
 */
let _browserClientInstance: ReturnType<typeof _createBrowserClient> | null = null;

export function createClient() {
  const isInvalidUrl = !SUPABASE_URL || SUPABASE_URL === "undefined" || !SUPABASE_URL.startsWith("http");
  const isInvalidKey = !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "undefined";

  if (isInvalidUrl || isInvalidKey) {
    // Return a dummy client during build to prevent crashes
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
      },
    } as any;
  }
  if (!_browserClientInstance) {
    _browserClientInstance = _createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _browserClientInstance;
}

/**
 * Server Supabase client — use inside Server Components and Route Handlers.
 * Requires the Next.js cookies() store to be passed in.
 * Must NOT be a singleton — each request has its own cookie store.
 */
export function createServerSupabaseClient(cookieStore: ReadonlyRequestCookies) {
  const isInvalidUrl = !SUPABASE_URL || SUPABASE_URL === "undefined" || !SUPABASE_URL.startsWith("http");
  const isInvalidKey = !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "undefined";

  if (isInvalidUrl || isInvalidKey) {
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
      },
    } as any;
  }
  return _createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore;
          // middleware keeps the session refreshed.
        }
      },
    },
  });
}
