"use client";

// Force dynamic rendering to ensure middleware/auth checks skip static cache
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase";

/**
 * Dashboard layout — wraps all authenticated pages with the sidebar.
 * Authenticated redirection is handled at the server level by middleware.ts.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setLoading(false);
      } else {
        // Fallback: if no session, redirect to login
        window.location.href = "/login";
      }
    }
    checkAuth();
  }, [supabase]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)'
      }}>
        <div className="animate-spin" style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--accent)',
          borderTopColor: 'transparent',
          borderRadius: '50%'
        }} />
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="main-content">{children}</main>
    </>
  );
}
