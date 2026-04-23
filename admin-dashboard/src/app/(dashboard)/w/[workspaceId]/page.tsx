"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useMemo } from "react";
import { useLanguage } from "@/components/LanguageContext";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    Users,
    MessageCircle,
    AlertCircle,
    Activity,
    Settings,
    Pause,
    Play
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { apiFetch } from "@/lib/auth";

export default function WorkspaceOverview() {
    const { t } = useLanguage();
    const { workspaceId } = useParams();
    const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();

    const [logs, setLogs] = useState<any[]>([]);
    const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
    const [senderNames, setSenderNames] = useState<Record<string, { name: string; profile_pic: string }>>({});
    const [pausedSenders, setPausedSenders] = useState<Set<string>>(new Set());
    const [stats, setStats] = useState({
        totalMessages: 0,
        uniqueUsers: 0,
        avgConfidence: 0,
        handoffRate: 0
    });
    const [loading, setLoading] = useState(true);

    // Sync currentWorkspace with URL workspaceId
    useEffect(() => {
        if (workspaceId && workspaces.length > 0) {
            const target = workspaces.find(ws => ws.id === workspaceId);
            if (target && target.id !== currentWorkspace?.id) {
                setCurrentWorkspace(target);
            }
        }
    }, [workspaceId, workspaces, currentWorkspace, setCurrentWorkspace]);

    // Helper: get display name for a sender ID
    const displayName = (psid: string) => {
        const info = senderNames[psid];
        if (info?.name && info.name !== psid) {
            return `${info.name} (${psid.substring(0, 8)}...)`;
        }
        return `${psid.substring(0, 14)}...`;
    };

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
            return { ...g, avgScore, status: avgScore >= 0.5 ? 'auto' : 'handoff' };
        });
    }, [logs]);

    useEffect(() => {
        if (!currentWorkspace) return;

        async function fetchData() {
            setLoading(true);
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
                        const uniqueIds = [...users] as string[];
                        const nameRes = await apiFetch("/api/facebook/resolve-names", {
                            method: "POST",
                            body: JSON.stringify({ sender_ids: uniqueIds })
                        });
                        if (nameRes.ok) {
                            const nameData = await nameRes.json();
                            setSenderNames(nameData.names || {});
                        }
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
        apiFetch("/api/senders/paused")
            .then(res => res.ok ? res.json() : [])
            .then(data => setPausedSenders(new Set(data.map((d: any) => d.sender_id))))
            .catch(err => console.error(err));
    }, [currentWorkspace?.id]);

    // Đã thay text cứng "Loading workspace..."
    if (!currentWorkspace) return <div style={{ padding: 40 }}>{t('common.loading')}</div>;

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
            <header style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 700 }}>
                        {currentWorkspace.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '32px', color: 'var(--foreground)', margin: 0 }}>{currentWorkspace.name}</h1>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>{currentWorkspace.industry} • {t('overview.workspaceOverview')}</p>
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                <Link href={`/w/${workspaceId}/flows`} style={{ textDecoration: 'none' }}>
                    <div className="card glass" style={{ height: '160px', background: 'linear-gradient(135deg, var(--accent), #6366f1)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px', transition: 'transform 0.2s', border: 'none' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                        <h2 style={{ margin: 0, fontSize: '24px', color: 'white' }}>{t('overview.messengerBot')}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', opacity: 0.9 }}>
                            <Play size={16} /> {t('overview.openBotBuilder')}
                        </div>
                    </div>
                </Link>
                
                {/* Ô THÀNH VIÊN ĐÃ ĐƯỢC THÊM MÀU (color: var(--foreground)) */}
                <Link href={`/w/${workspaceId}/team`} style={{ textDecoration: 'none' }}>
                    <div className="card glass" style={{ height: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--foreground)' }}>{t('nav.team')}</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('overview.manageMembers')}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--accent)' }}>
                            <Users size={16} /> {stats.uniqueUsers} {t('overview.activeMembers')}
                        </div>
                    </div>
                </Link>
                
                {/* Ô CÀI ĐẶT ĐÃ ĐƯỢC THÊM MÀU (color: var(--foreground)) */}
                <Link href={`/w/${workspaceId}/settings`} style={{ textDecoration: 'none' }}>
                    <div className="card glass" style={{ height: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--foreground)' }}>{t('nav.settings')}</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('overview.configureSettings')}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--accent)' }}>
                            <Settings size={16} /> {t('overview.configureWorkspace')}
                        </div>
                    </div>
                </Link>
            </div>

            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '40px' }}>
                <h2 style={{ marginBottom: '24px' }}>{t('overview.analyticsPreview')}</h2>

                <div className="stats-grid" style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="card glass" style={{ padding: '20px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('overview.totalMessages')}</p>
                        <h2 style={{ fontSize: '28px', margin: '8px 0', color: 'var(--accent)' }}>{stats.totalMessages}</h2>
                    </div>
                    <div className="card glass" style={{ padding: '20px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('overview.uniqueUsers')}</p>
                        <h2 style={{ fontSize: '28px', margin: '8px 0', color: 'var(--accent)' }}>{stats.uniqueUsers}</h2>
                    </div>
                    <div className="card glass" style={{ padding: '20px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('overview.avgConfidence')}</p>
                        <h2 style={{ fontSize: '28px', margin: '8px 0', color: 'var(--accent)' }}>{stats.avgConfidence}%</h2>
                    </div>
                    <div className="card glass" style={{ padding: '20px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('overview.handoffRate')}</p>
                        <h2 style={{ fontSize: '28px', margin: '8px 0', color: '#ef4444' }}>{stats.handoffRate}%</h2>
                    </div>
                </div>

                <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>Active Customers Context</h3>
                <div className="card glass" style={{ overflow: 'hidden' }}>
                    {groupedLogs.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No active conversations recorded yet.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '14px', color: 'var(--foreground)' }}>Customer</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '14px', color: 'var(--foreground)' }}>Messages Sent</th>
                                    <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '14px', color: 'var(--foreground)' }}>Bot Intervention Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedLogs.sort((a, b) => b.items.length - a.items.length).map((g) => {
                                    const isPaused = pausedSenders.has(g.sender_id);
                                    let statusText = "Handled Automatically";
                                    let statusColor = "#10b981";
                                    let statusBg = "rgba(16, 185, 129, 0.1)";

                                    if (isPaused) {
                                        statusText = "Paused (Human handling)";
                                        statusColor = "#f59e0b";
                                        statusBg = "rgba(245, 158, 11, 0.1)";
                                    } else if (g.status === 'handoff') {
                                        statusText = "Requires Attention";
                                        statusColor = "#ef4444";
                                        statusBg = "rgba(239, 68, 68, 0.1)";
                                    }

                                    return (
                                        <tr key={g.sender_id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {senderNames[g.sender_id]?.profile_pic ? (
                                                        <img
                                                            src={senderNames[g.sender_id].profile_pic}
                                                            alt="Profile"
                                                            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
                                                        />
                                                    ) : (
                                                        <div style={{ background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '10px', color: 'var(--foreground)' }}>
                                                            <MessageCircle size={16} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 500, color: 'var(--foreground)' }}>{displayName(g.sender_id)}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{g.sender_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', color: 'var(--foreground)' }}>
                                                <span style={{ fontWeight: 600 }}>{g.items.length}</span> messages
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <span style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    background: statusBg,
                                                    color: statusColor,
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    {isPaused ? <Pause size={12} /> : g.status === 'handoff' ? <AlertCircle size={12} /> : <Activity size={12} />}
                                                    {statusText}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                </div>
            </div>
        </div>
    );
}