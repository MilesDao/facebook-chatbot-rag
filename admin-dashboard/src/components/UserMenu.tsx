"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, LogOut, Settings, Globe, Moon, Sun, ChevronDown, Database, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { signOut, apiFetch } from "@/lib/auth";
import { useWorkspace } from "./WorkspaceContext";
import { useLanguage } from "./LanguageContext";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { usePathname, useRouter } from "next/navigation";

export function UserMenu() {
    const { isSidebarCollapsed } = useWorkspace();
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();
    const supabase = createClient();
    const pathname = usePathname();
    const router = useRouter();

    // Extract workspace ID from pathname if present
    const wsIdMatch = pathname.match(/\/w\/([^\/]+)/);
    const wsId = wsIdMatch ? wsIdMatch[1] : null;

    useEffect(() => {
        async function getUser() {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
        }
        getUser();

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="user-menu-container" ref={menuRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isSidebarCollapsed ? '0' : '8px',
                    padding: isSidebarCollapsed ? '8px' : '4px 8px',
                    borderRadius: isSidebarCollapsed ? '12px' : '20px',
                    background: 'var(--accent-alpha)',
                    border: '1px solid var(--accent)',
                    cursor: 'pointer',
                    color: 'var(--foreground)',
                    transition: 'all 0.2s',
                    width: isSidebarCollapsed ? '48px' : 'auto',
                    height: isSidebarCollapsed ? '48px' : 'auto'
                }}
                title={isSidebarCollapsed ? (user?.email || "User Account") : ""}
            >
                <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0
                }}>
                    <User size={14} />
                </div>
                {!isSidebarCollapsed && (
                    <>
                        <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user?.email?.split('@')[0] || "User"}
                        </span>
                        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                    </>
                )}
            </button>

            {isOpen && (
                <div
                    className="glass"
                    style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',
                        left: 0,
                        width: '220px',
                        padding: '12px',
                        borderRadius: '16px',
                        zIndex: 1000,
                        background: 'rgba(var(--card-bg-rgb), 0.7)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: '1px solid var(--card-border)'
                    }}
                >
                    <div style={{ padding: '0 8px 12px 8px', borderBottom: '1px solid var(--card-border)', marginBottom: '12px' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {t('user.signedInAs')}
                        </p>
                        <p style={{ fontSize: '13px', fontWeight: 600, margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--foreground)' }}>
                            {user?.email}
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 8px', marginBottom: '12px' }}>
                        {wsId && (
                            <>
                                <button
                                    onClick={() => { router.push(`/w/${wsId}/knowledge`); setIsOpen(false); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                                        borderRadius: '8px', background: 'transparent', border: 'none',
                                        color: 'var(--foreground)', fontSize: '12px', cursor: 'pointer', textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--nav-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Database size={14} color="var(--text-muted)" /> {t('nav.knowledge')}
                                </button>
                                <button
                                    onClick={() => { router.push(`/w/${wsId}/handoffs`); setIsOpen(false); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                                        borderRadius: '8px', background: 'transparent', border: 'none',
                                        color: 'var(--foreground)', fontSize: '12px', cursor: 'pointer', textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--nav-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Inbox size={14} color="var(--text-muted)" /> {t('nav.handoffs')}
                                </button>
                                <button
                                    onClick={() => { router.push(`/w/${wsId}/settings`); setIsOpen(false); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                                        borderRadius: '8px', background: 'transparent', border: 'none',
                                        color: 'var(--foreground)', fontSize: '12px', cursor: 'pointer', textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--nav-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Settings size={14} color="var(--text-muted)" /> {t('nav.settings')}
                                </button>
                                <div style={{ height: '1px', background: 'var(--card-border)', margin: '4px 0' }} />
                            </>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Globe size={14} color="var(--text-muted)" />
                                <span style={{ fontSize: '12px', color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{t('user.language')}</span>
                            </div>
                            <LanguageToggle />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {t('user.appearance')}
                            </p>
                            <ThemeToggle variant="nav-item" />
                        </div>
                    </div>


                    <div style={{ borderTop: '1px solid var(--card-border)', marginTop: '12px', paddingTop: '8px' }}>
                        <button
                            onClick={() => {
                                if (confirm(t('user.signOut') + "?")) signOut();
                            }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <LogOut size={14} /> {t('user.signOut')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
