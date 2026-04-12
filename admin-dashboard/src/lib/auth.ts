/**
 * auth.ts — Supabase auth helpers for "use client" components.
 *
 * Replaces the old localStorage-based fake auth.
 * All functions use the real Supabase session stored in httpOnly cookies.
 */

import { createClient } from "./supabase";

/** Get the current session (null if not logged in). */
export async function getSession() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Build the Authorization header for backend API calls.
 * Returns an empty object if there is no active session.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Convenience wrapper: fetch() that automatically injects the Supabase JWT.
 * Use this in all pages that call /api/* backend endpoints.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const isFormData = options.body instanceof FormData;

  return fetch(url, {
    ...options,
    headers: {
      // Only set Content-Type for JSON; let the browser handle FormData boundary
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
      ...(options.headers as Record<string, string>),
    },
  });
}

/** Sign out and redirect to login. */
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/login";
}
