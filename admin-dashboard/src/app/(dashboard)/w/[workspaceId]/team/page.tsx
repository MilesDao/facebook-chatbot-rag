"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/auth";
import { useWorkspace } from "@/components/WorkspaceContext";
import { useLanguage } from "@/components/LanguageContext";
import { Users, UserPlus, Shield, Eye, Crown, Trash2 } from "lucide-react";

interface Member {
    id: string;
    workspace_id: string;
    user_id: string;
    role: string;
    invited_at: string;
}

const roleIcons: Record<string, React.ReactNode> = {
    owner: <Crown size={14} color="#f59e0b" />,
    admin: <Shield size={14} color="#3b82f6" />,
    viewer: <Eye size={14} color="var(--text-muted)" />,
};

const roleBadgeColors: Record<string, string> = {
    owner: "rgba(245,158,11,0.15)",
    admin: "rgba(59,130,246,0.15)",
    viewer: "rgba(128,128,128,0.15)",
};

export default function TeamPage() {
    const { t } = useLanguage();
    const { currentWorkspace } = useWorkspace();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMembers = useCallback(async () => {
        if (!currentWorkspace) return;
        try {
            const res = await apiFetch(`/api/workspaces/${currentWorkspace.id}/members`);
            if (res.ok) {
                setMembers(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }, [currentWorkspace]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    async function removeMember(userId: string) {
        // Fix chữ cứng ở popup Confirm
        if (!currentWorkspace || !confirm(t('team.removeConfirm'))) return;
        try {
            await apiFetch(`/api/workspaces/${currentWorkspace.id}/members/${userId}`, { method: "DELETE" });
            fetchMembers();
        } catch (e) {
            console.error(e);
        }
    }

    if (!currentWorkspace) {
        return (
            <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                {/* Fix chữ cứng */}
                {t('team.selectWorkspace')}
            </div>
        );
    }

    const isOwnerOrAdmin = currentWorkspace.user_role === "owner" || currentWorkspace.user_role === "admin";

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                    <h1 style={{ color: "var(--foreground)", display: "flex", alignItems: "center", gap: 10, fontSize: "32px", margin: 0, padding: 0 }}>
                        <Users color="var(--accent)" size={32} /> {t('nav.team')}
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
                        {/* Fix chữ cứng */}
                        {t('team.desc')}
                    </p>
                </div>
                {isOwnerOrAdmin && (
                    <button
                        // Fix chữ cứng trong Alert
                        onClick={() => alert(t('team.inviteAlert'))}
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
                        {/* Fix chữ cứng */}
                        <UserPlus size={16} /> {t('team.inviteMember')}
                    </button>
                )}
            </div>

            {/* Role Legend Popover */}
            <div style={{ marginBottom: 20, position: "relative", display: "inline-block" }} className="role-legend-container">
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13, cursor: "help" }}>
                    <Shield size={16} /> {t('team.rolesExplanation')}
                </div>
                <div className="glass role-legend-popover" style={{ 
                    position: "absolute", 
                    top: "100%", 
                    left: 0, 
                    marginTop: 8, 
                    padding: 16, 
                    display: "none", 
                    flexDirection: "column", 
                    gap: 12, 
                    width: 320, 
                    zIndex: 10 
                }}>
                    {/* Fix toàn bộ chữ cứng phần mô tả quyền */}
                    {[
                        { role: "owner", label: `${t('team.owner')} — ${t('team.ownerDesc')}` },
                        { role: "admin", label: `${t('team.admin')} — ${t('team.adminDesc')}` },
                        { role: "viewer", label: `${t('team.viewer')} — ${t('team.viewerDesc')}` },
                    ].map(({ role, label }) => (
                        <div key={role} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                            <div style={{ marginTop: 2 }}>{roleIcons[role]}</div>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                .role-legend-container:hover .role-legend-popover {
                    display: flex !important;
                }
            `}} />

            {/* Members List */}
            {loading ? (
<<<<<<< HEAD
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>{t('common.loading')}</div>
=======
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading...</div>
            ) : members.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                    No team members found.
                </div>
>>>>>>> 200ddb627d6ba468032f9822ed1aebdf52b77499
            ) : (
                <div className="custom-scrollbar" style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto", padding: "16px", gap: "12px" }}>
                    {members.map((member: any) => (
                        <div
                            key={member.id}
                            style={{
                                padding: "16px",
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                background: "var(--nav-hover)",
                                borderRadius: "12px",
                                border: "1px solid var(--card-border)"
                            }}
                        >
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: "var(--accent-alpha)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: 14,
                                color: "var(--accent)",
                            }}>
<<<<<<< HEAD
                                {(member.name || member.user_id).substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: "var(--foreground)", fontSize: 14 }}>
                                    {member.name || member.user_id}
                                </div>
                                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                    {t('team.joined')} {new Date(member.invited_at).toLocaleDateString()}
=======
                                {member.role === 'owner' ? 'O' : 'M'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 14 }}>
                                    {member.role === 'owner' ? 'Workspace Owner' : `Team Member`}
                                </div>
                                <div style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "monospace" }}>
                                    ID: {member.user_id.substring(0, 16)}...
                                </div>
                                <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                                    Joined {new Date(member.invited_at).toLocaleDateString()}
>>>>>>> 200ddb627d6ba468032f9822ed1aebdf52b77499
                                </div>
                            </div>
                            <span style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                background: roleBadgeColors[member.role] || roleBadgeColors.viewer,
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 500,
                                color: "var(--foreground)",
                            }}>
                                {roleIcons[member.role]}
                                {/* Dịch luôn tên quyền (Owner -> Chủ sở hữu) dựa vào JSON đã có */}
                                {t(`team.${member.role}`)}
                            </span>
                            {isOwnerOrAdmin && member.role !== "owner" && (
                                <button
                                    onClick={() => removeMember(member.user_id)}
                                    style={{
                                        padding: 6,
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "#ef4444",
                                        opacity: 0.6,
                                    }}
                                    title={t('team.removeMember')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}