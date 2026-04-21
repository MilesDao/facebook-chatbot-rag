"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, LogOut, Settings, Globe, Moon, Sun, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { signOut } from "@/lib/auth";
import { useLanguage } from "./LanguageContext";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";

export function UserMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();
    const supabase = createClient();

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
                    gap: '8px',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    background: 'var(--accent-alpha)',
                    border: '1px solid var(--accent)',
                    cursor: 'pointer',
                    color: 'var(--foreground)',
                    transition: 'all 0.2s'
                }}
            >
                <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                }}>
                    <User size={14} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {user?.email?.split('@')[0] || "User"}
                </span>
                <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isOpen && (
                <div
                    className="glass"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: '240px',
                        padding: '8px',
                        borderRadius: '12px',
                        zIndex: 1000,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        border: '1px solid var(--card-border)'
                    }}
                >
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--card-border)', marginBottom: '8px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Signed in as</p>
                        <p style={{ fontSize: '14px', fontWeight: 600, margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px', color: 'var(--foreground)' }}>Language</span>
                            <LanguageToggle />
                        </div>

                        <div style={{ marginTop: '4px' }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Appearance</p>
                            <ThemeToggle variant="nav-item" />
                        </div>
                    </div>


                    <div style={{ borderTop: '1px solid var(--card-border)', marginTop: '8px', paddingTop: '8px' }}>
                        <button
                            onClick={() => {
                                if (confirm("Sign out?")) signOut();
                            }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                textAlign: 'left'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <LogOut size={16} /> Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
