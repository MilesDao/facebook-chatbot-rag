"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/auth";
import { useWorkspace } from "@/components/WorkspaceContext";
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
        if (!currentWorkspace || !confirm("Remove this member?")) return;
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
                Please select a workspace first.
            </div>
        );
    }

    const isOwnerOrAdmin = currentWorkspace.user_role === "owner" || currentWorkspace.user_role === "admin";

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                    <h1 style={{ color: "var(--foreground)", display: "flex", alignItems: "center", gap: 10 }}>
                        <Users color="var(--accent)" /> Team
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
                        Manage workspace members and roles
                    </p>
                </div>
                {isOwnerOrAdmin && (
                    <button
                        onClick={() => alert("Email invitation requires Supabase Admin API setup. Coming soon!")}
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
                        <UserPlus size={16} /> Invite Member
                    </button>
                )}
            </div>

            {/* Role Legend */}
            <div className="card" style={{ padding: 16, marginBottom: 20, display: "flex", gap: 24 }}>
                {[
                    { role: "owner", label: "Owner — Full access, manage workspace & billing" },
                    { role: "admin", label: "Admin — Manage bot, flows, knowledge, handoffs" },
                    { role: "viewer", label: "Viewer — Read-only: analytics, logs" },
                ].map(({ role, label }) => (
                    <div key={role} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                        {roleIcons[role]}
                        <span>{label}</span>
                    </div>
                ))}
            </div>

            {/* Members List */}
            {loading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading...</div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {members.map((member) => (
                        <div
                            key={member.id}
                            className="card"
                            style={{
                                padding: "14px 20px",
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
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
                                {member.user_id.substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: "var(--foreground)", fontSize: 14 }}>
                                    {member.user_id}
                                </div>
                                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                    Joined {new Date(member.invited_at).toLocaleDateString()}
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
                                {member.role}
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
                                    title="Remove member"
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
