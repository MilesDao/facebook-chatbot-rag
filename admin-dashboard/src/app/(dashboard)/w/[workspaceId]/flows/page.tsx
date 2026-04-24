"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/auth";
import { useWorkspace } from "@/components/WorkspaceContext";
import { useLanguage } from "@/components/LanguageContext";
import { GitBranch, Plus, Trash2, Play, Pause, Edit3, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Flow {
    id: string;
    name: string;
    trigger_keywords: string[];
    is_default: boolean;
    is_active: boolean;
    created_at: string;
}

export default function FlowsPage() {
    const { currentWorkspace } = useWorkspace();
    const { t } = useLanguage();
    const [flows, setFlows] = useState<Flow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newKeywords, setNewKeywords] = useState("");

    const fetchFlows = useCallback(async () => {
        try {
            const res = await apiFetch("/api/flows");
            if (res.ok) {
                setFlows(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (currentWorkspace) fetchFlows();
    }, [currentWorkspace, fetchFlows]);

    async function createFlow() {
        if (!newName.trim()) return;
        const keywords = newKeywords.split(",").map((k) => k.trim()).filter(Boolean);
        try {
            const res = await apiFetch("/api/flows", {
                method: "POST",
                body: JSON.stringify({ name: newName, trigger_keywords: keywords }),
            });
            if (res.ok) {
                setNewName("");
                setNewKeywords("");
                setShowCreate(false);
                fetchFlows();
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function toggleActive(flow: Flow) {
        try {
            await apiFetch(`/api/flows/${flow.id}`, {
                method: "PUT",
                body: JSON.stringify({ is_active: !flow.is_active }),
            });
            fetchFlows();
        } catch (e) {
            console.error(e);
        }
    }

    async function deleteFlow(flowId: string) {
        // Đã bọc text cứng ở hộp thoại xác nhận xóa
        if (!confirm(t('flows.deleteConfirm'))) return;
        try {
            await apiFetch(`/api/flows/${flowId}`, { method: "DELETE" });
            fetchFlows();
        } catch (e) {
            console.error(e);
        }
    }

    if (!currentWorkspace) {
        return (
            <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                {/* Đã bọc text cứng */}
                {t('common.selectWorkspace')}
            </div>
        );
    }

    return (
        <div style={{ background: 'transparent' }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 32,
                padding: '24px',
                background: 'rgba(var(--card-bg-rgb), 0.5)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                border: '1px solid var(--card-border)',
                boxShadow: '0 4px 24px -1px rgba(0,0,0,0.05)'
            }}>
                <div>
                    <h1 style={{ color: "var(--foreground)", display: "flex", alignItems: "center", gap: 12, margin: 0, fontSize: '32px' }}>
                        <div style={{ background: 'var(--accent-alpha)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <GitBranch color="var(--accent)" size={24} />
                        </div>
                        {/* Đã bọc text cứng */}
                        {t('flows.title')}
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8, marginLeft: '4px' }}>
                        {/* Đã bọc text cứng */}
                        {t('flows.desc')}
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "10px 18px",
                        background: "var(--accent)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    <Plus size={16} /> {t('flows.newFlow')}
                </button>
            </div>

            {/* Create Flow Form */}
            {showCreate && (
                <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            // Đã bọc Placeholder
                            placeholder={t('flows.namePlaceholder')}
                            style={{
                                flex: 1,
                                padding: "10px 14px",
                                background: "var(--card-bg)",
                                border: "1px solid var(--card-border)",
                                borderRadius: 8,
                                color: "var(--foreground)",
                                fontSize: 14,
                            }}
                        />
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <input
                            type="text"
                            value={newKeywords}
                            onChange={(e) => setNewKeywords(e.target.value)}
                            // Đã bọc Placeholder
                            placeholder={t('flows.triggersPlaceholderExample')}
                            style={{
                                flex: 1,
                                padding: "10px 14px",
                                background: "var(--card-bg)",
                                border: "1px solid var(--card-border)",
                                borderRadius: 8,
                                color: "var(--foreground)",
                                fontSize: 14,
                            }}
                        />
                        <button onClick={createFlow} style={{
                            padding: "10px 20px",
                            background: "var(--accent)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}>
                            {t('flows.createFlow')}
                        </button>
                    </div>
                </div>
            )}

            {/* Flow List */}
            {loading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>{t('common.loading')}</div>
            ) : flows.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 60 }}>
                    <GitBranch size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                    <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
                        {/* Đã bọc text cứng */}
                        {t('flows.empty')}
                    </p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {flows.map((flow) => (
                        <div
                            key={flow.id}
                            className="card"
                            style={{
                                padding: "20px 24px",
                                display: "flex",
                                alignItems: "center",
                                gap: 20,
                                opacity: flow.is_active ? 1 : 0.6,
                                border: '1.5px solid var(--card-border)',
                                borderRadius: '18px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                transition: 'all 0.2s ease',
                                background: 'var(--card-bg)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--accent)';
                                e.currentTarget.style.boxShadow = '0 0 0 4px var(--accent-glow)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--card-border)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                            }}
                        >
                            <div style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: flow.is_active ? "#22c55e" : "var(--text-muted)",
                            }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 15 }}>
                                    {flow.name}
                                    {flow.is_default && (
                                        <span style={{
                                            marginLeft: 8,
                                            padding: "2px 8px",
                                            background: "var(--accent-alpha)",
                                            color: "var(--accent)",
                                            borderRadius: 6,
                                            fontSize: 11,
                                            fontWeight: 500,
                                        }}>
                                            {t('flows.defaultFlow')}
                                        </span>
                                    )}
                                </div>
                                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                                    {/* Đã bọc chữ Keywords và No trigger keywords */}
                                    {flow.trigger_keywords?.length > 0
                                        ? `${t('flows.keywords')}: ${flow.trigger_keywords.join(", ")}`
                                        : t('flows.noKeywords')}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    onClick={() => toggleActive(flow)}
                                    // Bọc tooltip Title khi hover
                                    title={flow.is_active ? t('common.deactivate') : t('common.activate')}
                                    style={{
                                        padding: 8,
                                        background: "var(--card-bg)",
                                        border: "1px solid var(--card-border)",
                                        borderRadius: 8,
                                        cursor: "pointer",
                                        color: flow.is_active ? "#22c55e" : "var(--text-muted)",
                                    }}
                                >
                                    {flow.is_active ? <Play size={16} /> : <Pause size={16} />}
                                </button>
                                <Link
                                    href={`/w/${currentWorkspace.id}/flows/${flow.id}`}
                                    style={{
                                        padding: 8,
                                        background: "var(--card-bg)",
                                        border: "1px solid var(--card-border)",
                                        borderRadius: 8,
                                        color: "var(--accent)",
                                        display: "flex",
                                        alignItems: "center",
                                    }}
                                >
                                    <Edit3 size={16} />
                                </Link>
                                <button
                                    onClick={() => deleteFlow(flow.id)}
                                    style={{
                                        padding: 8,
                                        background: "var(--card-bg)",
                                        border: "1px solid var(--card-border)",
                                        borderRadius: 8,
                                        cursor: "pointer",
                                        color: "#ef4444",
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}