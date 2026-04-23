"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/auth";
import { useWorkspace } from "@/components/WorkspaceContext";
import {
    GraduationCap,
    ShoppingBag,
    Headphones,
    Calendar,
    Settings,
    ArrowRight,
    Loader2
} from "lucide-react";

const TEMPLATES = [
    {
        id: "admissions",
        name: "Admissions & University",
        description: "Perfect for schools, universities, and training centers.",
        icon: <GraduationCap size={32} />,
        color: "#4f46e5"
    },
    {
        id: "ecommerce",
        name: "E-commerce & Sales",
        description: "Optimized for product catalogs, pricing, and orders.",
        icon: <ShoppingBag size={32} />,
        color: "#db2777"
    },
    {
        id: "customer_service",
        name: "Customer Support",
        description: "Focus on FAQs, troubleshooting, and handoffs.",
        icon: <Headphones size={32} />,
        color: "#059669"
    },
    {
        id: "booking",
        name: "Appointment & Booking",
        description: "Ideal for spas, clinics, and service providers.",
        icon: <Calendar size={32} />,
        color: "#d97706"
    },
    {
        id: "general",
        name: "Blank Canvas",
        description: "Start from scratch with a clean, generic bot.",
        icon: <Settings size={32} />,
        color: "#6b7280"
    }
];

export default function NewWorkspacePage() {
    const router = useRouter();
    const { refreshWorkspaces, setCurrentWorkspace } = useWorkspace();
    const [name, setName] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

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
                // Response format is { status: "success", data: { id, ... } }
                const newId = responseData.data?.id || responseData.id;
                router.push(`/w/${newId}`);
            } else {
                const err = await res.json();
                alert(err.detail || "Failed to create workspace");
            }
        } catch (error) {
            console.error("Create workspace failed:", error);
            alert("An error occurred. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 20px' }}>
            <div style={{ marginBottom: '48px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>Create New Workspace</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '18px' }}>Launch a new chatbot project in seconds with industry-specific templates.</p>
            </div>

            <div style={{ maxWidth: 500, margin: '0 auto 60px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>WORKSPACE NAME</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. My Chatbot Project"
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
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Choose a Template</h2>
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
                            Creating...
                        </>
                    ) : (
                        <>
                            Create Workspace <ArrowRight size={20} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
