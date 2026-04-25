"use client";

// Force dynamic rendering to ensure middleware/auth checks skip static cache
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { WorkspaceProvider } from "@/components/WorkspaceContext";
import { createClient } from "@/lib/supabase";
import { apiFetch } from "@/lib/auth";

const WAKE_MAX_ATTEMPTS = 8;   // total retries
const WAKE_INTERVAL_S  = 10;  // seconds between retries

/**
 * Dashboard layout — wraps all authenticated pages with the sidebar.
 * Authenticated redirection is handled at the server level by middleware.ts.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authLoading,   setAuthLoading]   = useState(true);
  const [backendStatus, setBackendStatus] = useState<"checking" | "waking" | "connected" | "error">("checking");
  const [wakeAttempt,   setWakeAttempt]   = useState(0);
  const [countdown,     setCountdown]     = useState(WAKE_INTERVAL_S);
  const supabase = createClient();

  // countdown tick ref — cleared when backend connects
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }
      setAuthLoading(false);
      await wakeBackend();
    }

    async function pingOnce(): Promise<boolean> {
      try {
        const res = await apiFetch("/api/health");
        return res.ok;
      } catch {
        return false;
      }
    }

    async function wakeBackend() {
      // First quick check
      setBackendStatus("checking");
      const alive = await pingOnce();
      if (alive) { setBackendStatus("connected"); return; }

      // Backend sleeping — begin wake-up loop
      setBackendStatus("waking");

      for (let attempt = 1; attempt <= WAKE_MAX_ATTEMPTS; attempt++) {
        setWakeAttempt(attempt);
        setCountdown(WAKE_INTERVAL_S);

        // Countdown display
        clearCountdown();
        countdownRef.current = setInterval(() => {
          setCountdown(prev => (prev > 1 ? prev - 1 : 0));
        }, 1000);

        // Wait the interval, then ping again
        await new Promise(r => setTimeout(r, WAKE_INTERVAL_S * 1000));
        clearCountdown();

        const ok = await pingOnce();
        if (ok) {
          setBackendStatus("connected");
          return;
        }
      }

      // All retries exhausted — enter dashboard with warning
      setBackendStatus("error");
    }

    checkAuth();
    return () => clearCountdown();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Loading screens ── */
  if (authLoading) {
    return (
      <div style={loadingWrap}>
        <Spinner />
        <p style={loadingText}>Authenticating...</p>
      </div>
    );
  }

  if (backendStatus === "checking") {
    return (
      <div style={loadingWrap}>
        <Spinner />
        <p style={loadingText}>Connecting to backend...</p>
      </div>
    );
  }

  if (backendStatus === "waking") {
    const progress = (wakeAttempt / WAKE_MAX_ATTEMPTS) * 100;
    return (
      <div style={loadingWrap}>
        {/* Pulsing server icon */}
        <div style={{ fontSize: '40px', animation: 'pulse 1.5s ease-in-out infinite' }}>🖥️</div>

        <p style={{ ...loadingText, fontSize: '16px', color: 'var(--text)' }}>
          Waking up server...
        </p>
        <p style={{ ...loadingText, fontSize: '13px' }}>
          Attempt {wakeAttempt} / {WAKE_MAX_ATTEMPTS} — next ping in{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{countdown}s</span>
        </p>

        {/* Progress bar */}
        <div style={{
          width: '240px',
          height: '4px',
          borderRadius: '4px',
          background: 'var(--card-border)',
          overflow: 'hidden',
          marginTop: '4px'
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            borderRadius: '4px',
            background: 'var(--accent)',
            transition: 'width 0.5s ease'
          }} />
        </div>

        <p style={{ ...loadingText, fontSize: '12px', marginTop: '4px' }}>
          Render free tier spins down after inactivity — this may take up to a minute.
        </p>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50%       { transform: scale(1.12); opacity: 0.75; }
          }
        `}</style>
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
            display: 'flex',
            flexDirection: 'column',
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

/* ── Shared style helpers ── */
const loadingWrap: React.CSSProperties = {
  height: '100vh',
  width: '100vw',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--background)',
  gap: '16px',
};

const loadingText: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '14px',
  fontWeight: 500,
  letterSpacing: '0.3px',
  textAlign: 'center',
  maxWidth: '300px',
};

function Spinner() {
  return (
    <div
      className="animate-spin"
      style={{
        width: '44px',
        height: '44px',
        border: '4px solid var(--card-border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
      }}
    />
  );
}
