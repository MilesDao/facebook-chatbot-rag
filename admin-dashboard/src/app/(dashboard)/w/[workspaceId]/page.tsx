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
    Play,
    X,
    MessageSquare,
    UserMinus,
    Zap,
    Shield,
    AlertTriangle
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
        avgConfidence: 0
    });
    const [loading, setLoading] = useState(true);
    const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);



    const openChatHistory = async (sender_id: string) => {
        setSelectedSenderId(sender_id);
        setChatHistory([]);
        setIsHistoryLoading(true);
        try {
            const res = await apiFetch(`/api/messages/${sender_id}`);
            if (res.ok) {
                const data = await res.json();
                setChatHistory(data.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleToggleAI = async (sender_id: string, currentlyPaused: boolean) => {
        try {
            if (currentlyPaused) {
                await apiFetch(`/api/senders/${sender_id}/pause`, { method: "DELETE" });
                setPausedSenders(prev => { const n = new Set(prev); n.delete(sender_id); return n; });
            } else {
                await apiFetch(`/api/senders/${sender_id}/pause`, { method: "POST" });
                setPausedSenders(prev => { const n = new Set(prev); n.add(sender_id); return n; });
            }
        } catch (e) { console.error(e); }
    };

    const handleDeleteCustomer = async (sender_id: string) => {
        if (!confirm("⚠️ PERMANENT ACTION: This will delete all chat history, documents, and settings for this customer. Proceed?")) return;

        try {
            const res = await apiFetch(`/api/senders/${sender_id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setLogs(prev => prev.filter(log => log.sender_id !== sender_id));
                setSelectedSenderId(null);
            }
        } catch (e) {
            console.error("Delete customer error:", e);
        }
    };



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
            return { ...g, avgScore, status: avgScore >= 0.5 ? 'auto' : 'low-confidence' };
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
                        const avgConf = data.reduce((acc: number, l: any) => acc + l.confidence_score, 0) / data.length;
                        setStats({
                            totalMessages: data.length,
                            uniqueUsers: users.size,
                            avgConfidence: Math.round(avgConf * 100)
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

    const isMainLoading = loading;

    if (!currentWorkspace) return <div style={{ padding: 40 }}>{t('common.loading')}</div>;

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px' }}>
            <header style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--accent), #4f46e5)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 800, boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)' }}>
                        {currentWorkspace.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--foreground)', margin: 0, letterSpacing: '-0.03em' }}>{currentWorkspace.name}</h1>
                        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '15px' }}>{currentWorkspace.industry} • {t('overview.workspaceOverview')}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ padding: '8px 16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                        <Activity size={16} color="#10b981" />
                        <span>System Online</span>
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px', marginBottom: '48px' }}>
                <Link href={`/w/${workspaceId}/flows`} style={{ textDecoration: 'none' }}>
                    <div className="card glass" style={{ height: '180px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '28px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: 'none', position: 'relative', overflow: 'hidden' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
                        <div>
                            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'white' }}>{t('overview.messengerBot')}</h2>
                            <p style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>Design and deploy intelligent chat flows</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#6366f1' }}>
                            View flows <Play size={14} fill="#6366f1" />
                        </div>
                    </div>
                </Link>

                <Link href={`/w/${workspaceId}/team`} style={{ textDecoration: 'none' }}>
                    <div className="card glass" style={{ height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '28px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--foreground)' }}>{t('nav.team')}</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>Collaborate with your workspace members</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--accent)' }}>
                            <Users size={16} /> {stats.uniqueUsers} {t('overview.activeMembers')}
                        </div>
                    </div>
                </Link>

                <Link href={`/w/${workspaceId}/settings`} style={{ textDecoration: 'none' }}>
                    <div className="card glass" style={{ height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '28px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--nav.settings)' }}>{t('nav.settings')}</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>Global workspace and API configurations</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--accent)' }}>
                            <Settings size={16} /> Configure workspace
                        </div>
                    </div>
                </Link>
            </div>

            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.02em' }}>Analytics Preview</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Last 30 Days</div>
                    </div>
                </div>

                <div className="stats-grid" style={{ marginBottom: '48px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                    {[
                        { label: t('overview.totalMessages'), value: stats.totalMessages, icon: <MessageCircle size={20} />, color: 'var(--accent)' },
                        { label: t('overview.uniqueUsers'), value: stats.uniqueUsers, icon: <Users size={20} />, color: '#8b5cf6' },
                        { label: t('overview.avgConfidence'), value: `${stats.avgConfidence}%`, icon: <Activity size={20} />, color: '#10b981' }
                    ].map((stat, i) => (
                        <div key={i} className="card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ color: stat.color, background: `${stat.color}15`, padding: '10px', borderRadius: '12px' }}>{stat.icon}</div>
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>{stat.label}</p>
                                <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--foreground)' }}>{stat.value}</h2>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginBottom: '48px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.02em' }}>Active Customers Context</h3>
                        <div style={{ padding: '6px 14px', background: 'var(--accent-alpha)', color: 'var(--accent)', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}>
                            {groupedLogs.length} Conversations Active
                        </div>
                    </div>

                    <div className="card glass" style={{ padding: 0, border: '1px solid var(--card-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                        {isMainLoading ? (
                            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                        ) : groupedLogs.length === 0 ? (
                            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <MessageCircle size={48} style={{ opacity: 0.1, marginBottom: '20px' }} />
                                <p style={{ margin: 0, fontSize: '18px', fontWeight: 500 }}>No active conversations yet.</p>
                                <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.7 }}>Data will appear here once users start messaging.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(0,0,0,0.02)', textAlign: 'left' }}>
                                            <th style={{ padding: '20px 24px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)' }}>Customer</th>
                                            <th style={{ padding: '20px 24px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)' }}>Engagement</th>
                                            <th style={{ padding: '20px 24px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)' }}>Confidence</th>
                                            <th style={{ padding: '20px 24px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)' }}>Status</th>
                                            <th style={{ padding: '20px 24px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)' }}>AI Agent</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedLogs.sort((a, b) => b.items.length - a.items.length).map((g, idx) => {
                                            const isPaused = pausedSenders.has(g.sender_id);
                                            return (
                                                <tr key={g.sender_id} style={{
                                                    borderBottom: idx === groupedLogs.length - 1 ? 'none' : '1px solid var(--card-border)',
                                                    background: selectedSenderId === g.sender_id ? 'var(--accent-alpha)' : 'transparent',
                                                    transition: 'all 0.2s ease'
                                                }} className="table-row-hover">
                                                    <td style={{ padding: '20px 24px', cursor: 'pointer' }} onClick={() => openChatHistory(g.sender_id)}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                            <div style={{ position: 'relative' }}>
                                                                {senderNames[g.sender_id]?.profile_pic ? (
                                                                    <img
                                                                        src={senderNames[g.sender_id].profile_pic}
                                                                        alt=""
                                                                        style={{ width: 48, height: 48, borderRadius: "14px", objectFit: "cover", boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                                                    />
                                                                ) : (
                                                                    <div style={{ background: 'var(--accent-alpha)', color: 'var(--accent)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Users size={22} />
                                                                    </div>
                                                                )}
                                                                {!isPaused && <div style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, background: '#10b981', border: '3px solid var(--card-bg)', borderRadius: '50%' }} />}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '15px' }}>{displayName(g.sender_id)}</div>
                                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px', opacity: 0.6 }}>ID: {g.sender_id.substring(0, 10)}...</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '20px 24px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <span style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '15px' }}>{g.items.length} Messages</span>
                                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Latest interaction</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '20px 24px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{ flex: 1, height: '8px', minWidth: '90px', background: 'rgba(0,0,0,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                                                <div style={{
                                                                    height: '100%',
                                                                    width: `${Math.round(g.avgScore * 100)}%`,
                                                                    background: g.avgScore > 0.8 ? '#10b981' : g.avgScore > 0.5 ? '#f59e0b' : '#ef4444',
                                                                    transition: 'width 1.2s cubic-bezier(0.19, 1, 0.22, 1)'
                                                                }} />
                                                            </div>
                                                            <span style={{ fontWeight: 800, fontSize: '14px', color: g.avgScore > 0.5 ? 'var(--foreground)' : '#ef4444', minWidth: '35px' }}>
                                                                {Math.round(g.avgScore * 100)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '20px 24px' }}>
                                                        <div style={{ display: 'flex' }}>
                                                            {isPaused ? (
                                                                <div style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px',
                                                                    background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', fontSize: '13px', fontWeight: 800,
                                                                    border: '1px solid rgba(239, 68, 68, 0.2)', boxShadow: '0 2px 10px rgba(239, 68, 68, 0.05)',
                                                                    textTransform: 'uppercase', letterSpacing: '0.02em'
                                                                }}>
                                                                    <UserMinus size={15} />
                                                                    Admin Handling
                                                                </div>
                                                            ) : g.avgScore >= 0.5 ? (
                                                                <div style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px',
                                                                    background: 'rgba(99, 102, 241, 0.08)', color: '#6366f1', fontSize: '13px', fontWeight: 800,
                                                                    border: '1px solid rgba(99, 102, 241, 0.2)', boxShadow: '0 2px 10px rgba(99, 102, 241, 0.05)',
                                                                    textTransform: 'uppercase', letterSpacing: '0.02em'
                                                                }}>
                                                                    <Zap size={15} fill="#6366f1" />
                                                                    AI Autopilot
                                                                </div>
                                                            ) : (
                                                                <div style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px',
                                                                    background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b', fontSize: '13px', fontWeight: 800,
                                                                    border: '1px solid rgba(245, 158, 11, 0.2)', boxShadow: '0 2px 10px rgba(245, 158, 11, 0.05)',
                                                                    textTransform: 'uppercase', letterSpacing: '0.02em'
                                                                }}>
                                                                    <AlertTriangle size={15} />
                                                                    Low Confidence
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '20px 24px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div
                                                                onClick={() => handleToggleAI(g.sender_id, isPaused)}
                                                                style={{
                                                                    width: '56px', height: '30px',
                                                                    background: isPaused ? 'rgba(0,0,0,0.1)' : '#10b981',
                                                                    borderRadius: '20px',
                                                                    position: 'relative',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                                    boxShadow: isPaused ? 'inset 0 2px 4px rgba(0,0,0,0.05)' : '0 4px 12px rgba(16, 185, 129, 0.3)'
                                                                }}
                                                            >
                                                                <div style={{
                                                                    width: '24px', height: '24px',
                                                                    background: 'white',
                                                                    borderRadius: '50%',
                                                                    position: 'absolute',
                                                                    top: '3px',
                                                                    left: isPaused ? '3px' : '29px',
                                                                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                                }} />
                                                            </div>
                                                            <span style={{ fontSize: '13px', fontWeight: 700, color: isPaused ? 'var(--text-muted)' : '#10b981' }}>
                                                                {isPaused ? 'PAUSED' : 'ACTIVE'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat History Drawer */}
            {
                selectedSenderId && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: '450px', background: 'var(--background)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,0.2)', animation: 'slideIn 0.3s ease-out' }}>
                            <div style={{ padding: '24px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'var(--accent-alpha)', color: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <MessageSquare size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--foreground)' }}>{selectedSenderId && displayName(selectedSenderId)}</h3>
                                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Conversation Log</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => selectedSenderId && handleDeleteCustomer(selectedSenderId)}
                                        title="Delete Customer"
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            color: '#ef4444',
                                            borderRadius: '10px',
                                            padding: '8px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#ef4444';
                                            e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                            e.currentTarget.style.color = '#ef4444';
                                        }}
                                    >
                                        <UserMinus size={16} />
                                        DELETE
                                    </button>
                                    <button onClick={() => setSelectedSenderId(null)} style={{ background: 'var(--background)', border: '1px solid var(--card-border)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-alpha)'} onMouseLeave={(e) => e.currentTarget.style.background = 'var(--background)'}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--background)' }} className="custom-scrollbar">
                                {isHistoryLoading ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                                        <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid var(--accent-alpha)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}></div>
                                        Loading history...
                                    </div>
                                ) : chatHistory.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                                        <p>No message history found.</p>
                                    </div>
                                ) : (
                                    chatHistory.map((msg, idx) => (
                                        <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                            <div style={{
                                                background: msg.role === 'user' ? 'var(--accent)' : 'var(--card-bg)',
                                                color: msg.role === 'user' ? 'white' : 'var(--foreground)',
                                                padding: '12px 16px',
                                                borderRadius: '18px',
                                                borderTopRightRadius: msg.role === 'user' ? '4px' : '18px',
                                                borderTopLeftRadius: msg.role === 'user' ? '18px' : '4px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                                fontSize: '14px',
                                                lineHeight: '1.5',
                                                border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)'
                                            }}>
                                                {msg.content}
                                            </div>
                                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '6px', textAlign: msg.role === 'user' ? 'right' : 'left', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                                {msg.role === 'user' ? 'CUSTOMER' : 'AI AGENT'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div style={{ padding: '24px', borderTop: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
                                <button className="btn" style={{ width: '100%', borderRadius: '12px', padding: '14px' }}>
                                    Resume Conversation
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .table-row-hover:hover {
                    background: var(--accent-alpha) !important;
                }
                .table-row-hover:hover div[style*="text-decoration: underline"] {
                    text-decoration-color: var(--accent) !important;
                }
            `}} />
        </div >
    );
}