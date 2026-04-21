"use client";

// Force dynamic rendering to ensure middleware/auth checks skip static cache
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { WorkspaceProvider } from "@/components/WorkspaceContext";
import { createClient } from "@/lib/supabase";
import { apiFetch } from "@/lib/auth";

/**
 * Dashboard layout — wraps all authenticated pages with the sidebar.
 * Authenticated redirection is handled at the server level by middleware.ts.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authLoading, setAuthLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "error">("checking");
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setAuthLoading(false);
        // Check backend connectivity
        try {
          const res = await apiFetch("/api/health");
          if (res.ok) {
            setBackendStatus("connected");
          } else {
            setBackendStatus("error");
          }
        } catch {
          setBackendStatus("error");
        }
      } else {
        // Fallback: if no session, redirect to login
        window.location.href = "/login";
      }
    }
    checkAuth();
  }, [supabase]);

  if (authLoading || backendStatus === "checking") {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        gap: '20px'
      }}>
        <div className="animate-spin" style={{
          width: '44px',
          height: '44px',
          border: '4px solid var(--card-border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%'
        }} />
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '14px',
          fontWeight: 500,
          letterSpacing: '0.3px'
        }}>
          {authLoading ? "Authenticating..." : "Connecting to backend..."}
        </p>
      </div>
    );
  }

  return (
    <WorkspaceProvider>
      {backendStatus === "error" && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          padding: '8px 16px',
          background: 'rgba(239, 68, 68, 0.12)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#ef4444',
          fontSize: '13px',
          textAlign: 'center',
          fontWeight: 500,
          backdropFilter: 'blur(8px)'
        }}>
          ⚠ Backend is unreachable. Some features may not work.
        </div>
      )}
      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Header />
          <main className="main-content" style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: backendStatus === "error" ? '24px' : '0'
          }}>
            {children}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
