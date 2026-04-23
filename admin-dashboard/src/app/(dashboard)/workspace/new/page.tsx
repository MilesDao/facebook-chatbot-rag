"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/auth";
import { useWorkspace } from "@/components/WorkspaceContext";
// Import thêm hook ngôn ngữ
import { useLanguage } from "@/components/LanguageContext";
import {
    GraduationCap,
    ShoppingBag,
    Headphones,
    Calendar,
    Settings,
    ArrowRight,
    Loader2
} from "lucide-react";

export default function NewWorkspacePage() {
    const router = useRouter();
    const { refreshWorkspaces, setCurrentWorkspace } = useWorkspace();
    // Gọi hàm t ra
    const { t } = useLanguage();
    const [name, setName] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // Đưa mảng TEMPLATES vào trong để gọi được hàm t()
    const TEMPLATES = [
        {
            id: "admissions",
            name: t("template.admissionsName"),
            description: t("template.admissionsDesc"),
            icon: <GraduationCap size={32} />,
            color: "#4f46e5"
        },
        {
            id: "ecommerce",
            name: t("template.ecommerceName"),
            description: t("template.ecommerceDesc"),
            icon: <ShoppingBag size={32} />,
            color: "#db2777"
        },
        {
            id: "customer_service",
            name: t("template.supportName"),
            description: t("template.supportDesc"),
            icon: <Headphones size={32} />,
            color: "#059669"
        },
        {
            id: "booking",
            name: t("template.bookingName"),
            description: t("template.bookingDesc"),
            icon: <Calendar size={32} />,
            color: "#d97706"
        },
        {
            id: "general",
            name: t("template.blankName"),
            description: t("template.blankDesc"),
            icon: <Settings size={32} />,
            color: "#6b7280"
        }
    ];

    useEffect(() => {
        setCurrentWorkspace(null);
    }, [setCurrentWorkspace]);

    const handleCreate = async () => {
        if (!name || !selectedTemplate) return;
        setCreating(true);
        try {
            const res = await apiFetch("/api/workspaces", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    industry: selectedTemplate
                })
            });
            if (res.ok) {
                const responseData = await res.json();
                await refreshWorkspaces();
                const newId = responseData.data?.id || responseData.id;
                router.push(`/w/${newId}`);
            } else {
                const err = await res.json();
                // Đã bọc thông báo lỗi
                alert(err.detail || t("workspace.errorFailed"));
            }
        } catch (error) {
            console.error("Create workspace failed:", error);
            // Đã bọc thông báo lỗi
            alert(t("workspace.errorOccurred"));
        } finally {
            setCreating(false);
        }
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 20px' }}>
            <div style={{ marginBottom: '48px', textAlign: 'center' }}>
                {/* Đã bọc text cứng */}
                <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>{t("workspace.createTitle")}</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '18px' }}>{t("workspace.createSubtitle")}</p>
            </div>

            <div style={{ maxWidth: 500, margin: '0 auto 60px' }}>
                {/* Đã bọc text cứng */}
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>{t("workspace.nameLabel")}</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    // Đã bọc Placeholder
                    placeholder={t("workspace.namePlaceholder")}
                    className="glass"
                    style={{
                        width: '100%',
                        padding: '16px',
                        fontSize: '18px',
                        borderRadius: '12px',
                        border: '1px solid var(--card-border)',
                        background: 'var(--card-bg)',
                        color: 'var(--foreground)',
                        outline: 'none focus:ring-2 focus:ring-blue-500'
                    }}
                />
            </div>

            <div style={{ marginBottom: '40px' }}>
                {/* Đã bọc text cứng */}
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>{t("workspace.chooseTemplate")}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {TEMPLATES.map((tmpl) => (
                        <div
                            key={tmpl.id}
                            onClick={() => setSelectedTemplate(tmpl.id)}
                            className={`card glass ${selectedTemplate === tmpl.id ? 'active' : ''}`}
                            style={{
                                padding: '24px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: selectedTemplate === tmpl.id ? '2px solid var(--accent)' : '1px solid var(--card-border)',
                                transform: selectedTemplate === tmpl.id ? 'translateY(-4px)' : 'none',
                                opacity: selectedTemplate && selectedTemplate !== tmpl.id ? 0.6 : 1
                            }}
                        >
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '12px',
                                background: tmpl.color + '20',
                                color: tmpl.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '20px'
                            }}>
                                {tmpl.icon}
                            </div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700 }}>{tmpl.name}</h3>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{tmpl.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '60px' }}>
                <button
                    onClick={handleCreate}
                    disabled={!name || !selectedTemplate || creating}
                    style={{
                        padding: '16px 40px',
                        fontSize: '18px',
                        fontWeight: 700,
                        borderRadius: '30px',
                        background: (name && selectedTemplate) ? 'var(--accent)' : 'var(--text-muted)',
                        color: 'white',
                        border: 'none',
                        cursor: (name && selectedTemplate) ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s',
                        boxShadow: '0 10px 20px -5px var(--accent)'
                    }}
                >
                    {creating ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            {/* Đã bọc text cứng */}
                            {t("workspace.creatingBtn")}
                        </>
                    ) : (
                        <>
                            {/* Đã bọc text cứng */}
                            {t("workspace.createBtn")} <ArrowRight size={20} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}