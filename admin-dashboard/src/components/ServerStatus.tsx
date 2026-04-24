'use client';

import { useEffect, useState, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type PingStatus = 'online' | 'offline' | 'checking';

interface HealthData {
  status: string;
  server_time: string;
  environment: string;
  service: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60_000; // re-ping every 60 s

// ── Helper ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ServerStatus() {
  const [status, setStatus] = useState<PingStatus>('checking');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [lastPinged, setLastPinged] = useState<Date | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const ping = useCallback(async () => {
    setStatus('checking');
    const t0 = performance.now();
    try {
      const res = await fetch('/api/proxy/health', { cache: 'no-store' });
      const latency = Math.round(performance.now() - t0);
      if (res.ok) {
        const data: HealthData = await res.json();
        setHealth(data);
        setLatencyMs(latency);
        setStatus('online');
      } else {
        setStatus('offline');
        setLatencyMs(null);
      }
    } catch {
      setStatus('offline');
      setLatencyMs(null);
    }
    setLastPinged(new Date());
  }, []);

  // Initial ping + interval
  useEffect(() => {
    ping();
    const id = setInterval(ping, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ping]);

  // ── Derived display values ─────────────────────────────────────────────

  const dotColor =
    status === 'online'
      ? 'var(--status-green, #22c55e)'
      : status === 'offline'
        ? 'var(--status-red, #ef4444)'
        : 'var(--status-yellow, #eab308)';

  const badgeLabel =
    status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Checking…';

  const envBadge = health?.environment ?? '—';

  return (
    <div className="glass card server-status-card" aria-label="Server health status">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="ss-header">
        <div className="ss-title-group">
          {/* Animated pulse dot */}
          <span className="ss-dot-wrap" aria-hidden="true">
            <span className="ss-dot" style={{ background: dotColor }} />
            {status === 'checking' && (
              <span className="ss-dot ss-dot-ping" style={{ background: dotColor }} />
            )}
            {status === 'online' && (
              <span className="ss-dot ss-dot-ripple" style={{ borderColor: dotColor }} />
            )}
          </span>
          <span className="ss-label">{badgeLabel}</span>
        </div>

        <button
          className="ss-refresh-btn"
          onClick={ping}
          title="Ping now"
          aria-label="Ping server now"
        >
          <RefreshIcon spinning={status === 'checking'} />
        </button>
      </div>

      {/* ── Metrics grid ───────────────────────────────────────────────── */}
      <div className="ss-metrics">
        <Metric
          label="Last Ping"
          value={lastPinged ? lastPinged.toLocaleTimeString() : '—'}
          icon="🕐"
        />
        <Metric
          label="Server Time"
          value={health?.server_time ? formatTime(health.server_time) : '—'}
          icon="🌐"
        />
        <Metric
          label="Latency"
          value={latencyMs !== null ? `${latencyMs} ms` : '—'}
          icon="⚡"
          accent={latencyMs !== null && latencyMs < 300}
        />
        <Metric label="Environment" value={envBadge} icon="🏷️" />
      </div>

      <style>{`
        .server-status-card {
          padding: 20px 24px;
          min-width: 260px;
        }

        .ss-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .ss-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 15px;
          color: var(--foreground);
        }

        /* ── Dot ── */
        .ss-dot-wrap {
          position: relative;
          width: 12px;
          height: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .ss-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: block;
          position: relative;
          z-index: 1;
        }

        /* ripple ring for online */
        .ss-dot-ripple {
          position: absolute;
          inset: -4px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid;
          background: transparent !important;
          animation: ss-ripple 2s ease-out infinite;
          z-index: 0;
        }

        @keyframes ss-ripple {
          0%   { transform: scale(0.6); opacity: 0.7; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        /* ping pulse for checking */
        .ss-dot-ping {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          animation: ss-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
          z-index: 0;
          opacity: 0.7;
        }

        @keyframes ss-ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }

        /* ── Refresh button ── */
        .ss-refresh-btn {
          background: var(--accent-alpha);
          border: 1px solid var(--card-border);
          border-radius: 8px;
          padding: 6px;
          cursor: pointer;
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease, box-shadow 0.2s ease;
        }

        .ss-refresh-btn:hover {
          background: var(--accent-glow);
          box-shadow: 0 0 10px var(--accent-glow);
        }

        /* ── Metrics ── */
        .ss-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .ss-metric {
          background: var(--accent-alpha);
          border: 1px solid var(--card-border);
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ss-metric-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .ss-metric-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--foreground);
          font-variant-numeric: tabular-nums;
        }

        .ss-metric-value.accent {
          color: var(--accent);
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Metric({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <div className="ss-metric">
      <span className="ss-metric-label">
        <span aria-hidden="true">{icon}</span> {label}
      </span>
      <span className={`ss-metric-value${accent ? ' accent' : ''}`}>{value}</span>
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        animation: spinning ? 'spin 0.8s linear infinite' : 'none',
        display: 'block',
      }}
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}
