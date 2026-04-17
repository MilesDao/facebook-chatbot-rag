"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useLanguage } from "@/components/LanguageContext";
import {
  Users,
  MessageCircle,
  AlertCircle,
  TrendingUp,
  Activity
} from "lucide-react";
import { apiFetch } from "@/lib/auth";

export default function Overview() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({
    totalMessages: 0,
    uniqueUsers: 0,
    avgConfidence: 0,
    handoffRate: 0
  });
  const [loading, setLoading] = useState(true);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, { sender_id: string; totalScore: number; items: any[] }> = {};

    logs.forEach(log => {
      const id = log.sender_id;
      if (!groups[id]) {
        groups[id] = { sender_id: id, totalScore: 0, items: [] };
      }
      groups[id].items.push(log);
      groups[id].totalScore += log.confidence_score;
    });

    return Object.values(groups).map(g => {
      const avgScore = g.items.length > 0 ? g.totalScore / g.items.length : 0;
      return {
        ...g,
        avgScore,
        status: avgScore >= 0.5 ? 'auto' : 'handoff'
      };
    });
  }, [logs]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiFetch("/api/analytics");

        if (res.ok) {
          const data = await res.json();
          setLogs(data);

          if (data.length > 0) {
            const users = new Set(data.map((l: any) => l.sender_id));
            const handoffs = data.filter((l: any) => l.handoff_triggered).length;
            const avgConf = data.reduce((acc: number, l: any) => acc + l.confidence_score, 0) / data.length;

            setStats({
              totalMessages: data.length,
              uniqueUsers: users.size,
              avgConfidence: Math.round(avgConf * 100),
              handoffRate: Math.round((handoffs / data.length) * 100)
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleExpand = (key: string) => {
    setExpandedLogs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', color: 'var(--foreground)' }}>{t("overview.title")}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{t("overview.desc")}</p>
      </header>

      <div className="stats-grid">
        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t("overview.total")}</p>
              <h2 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.totalMessages}</h2>
            </div>
            <MessageCircle color="var(--accent)" />
          </div>
        </div>

        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t("overview.active")}</p>
              <h2 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.uniqueUsers}</h2>
            </div>
            <Users color="#a855f7" />
          </div>
        </div>

        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t("overview.confidence")}</p>
              <h2 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.avgConfidence}%</h2>
            </div>
            <Activity color="#22c55e" />
          </div>
        </div>

        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t("overview.handoffRate")}</p>
              <h2 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.handoffRate}%</h2>
            </div>
            <AlertCircle color="#ef4444" />
          </div>
        </div>
      </div>

      <div className="card glass">
        <h2 style={{ color: 'var(--foreground)' }}>{t("overview.recent")}</h2>
        <table style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '33%', textAlign: 'center' }}>{t("table.sender")}</th>
              <th style={{ width: '33%', textAlign: 'center' }}>{t("table.score")} (Avg)</th>
              <th style={{ width: '33%', textAlign: 'center' }}>{t("table.status")}</th>
            </tr>
          </thead>
          <tbody>
            {(groupedLogs.length > 0 ? groupedLogs.slice(0, 10) : []).map((group, i) => (
              <React.Fragment key={i}>
                <tr onClick={() => toggleExpand(`group-${i}`)} style={{ cursor: 'pointer', background: expandedLogs[`group-${i}`] ? 'var(--nav-hover)' : 'transparent' }}>
                  <td style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'center', color: 'var(--foreground)' }}>{group.sender_id.substring(0, 12)}...</td>
                  <td style={{ textAlign: 'center' }}>{Math.round(group.avgScore * 100)}%</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: group.status === 'handoff' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                      color: group.status === 'handoff' ? '#ef4444' : '#22c55e'
                    }}>
                      {group.status === 'handoff' ? t("table.handoff") : t("table.auto")}
                    </span>
                  </td>
                </tr>
                {expandedLogs[`group-${i}`] && (
                  <tr>
                    <td colSpan={3} style={{ padding: '0', borderBottom: 'none' }}>
                      <div style={{ background: 'var(--nav-hover)', padding: '16px', borderBottom: '1px solid var(--card-border)' }}>
                        <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>{t("table.interactionDetails")}</h4>
                        <table style={{ width: '100%', tableLayout: 'fixed', background: 'var(--background)', borderRadius: '8px', overflow: 'hidden' }}>
                          <thead style={{ background: 'rgba(0,0,0,0.1)' }}>
                            <tr>
                              <th style={{ width: '35%', padding: '10px 8px', fontSize: '13px', textAlign: 'center' }}>{t("table.message")}</th>
                              <th style={{ width: '35%', padding: '10px 8px', fontSize: '13px', textAlign: 'center' }}>{t("table.reply")}</th>
                              <th style={{ width: '15%', padding: '10px 8px', fontSize: '13px', textAlign: 'center' }}>{t("table.score")}</th>
                              <th style={{ width: '15%', padding: '10px 8px', fontSize: '13px', textAlign: 'center' }}>{t("table.status")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((log: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                <td style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'center', color: 'var(--foreground)' }}>{log.user_message}</td>
                                <td style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'center', color: 'var(--foreground)' }}>{log.ai_reply}</td>
                                <td style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center' }}>{Math.round(log.confidence_score * 100)}%</td>
                                <td style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    background: log.handoff_triggered ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                    color: log.handoff_triggered ? '#ef4444' : '#22c55e'
                                  }}>
                                    {log.handoff_triggered ? t("table.handoff") : t("table.auto")}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {groupedLogs.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t("table.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
