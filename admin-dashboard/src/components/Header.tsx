"use client";

import React from "react";
import Link from "next/link";
import { UserMenu } from "./UserMenu";
import { useWorkspace } from "./WorkspaceContext";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

export function Header() {
    const { currentWorkspace, unsavedChanges, setUnsavedChanges } = useWorkspace();
    const pathname = usePathname();

    const isNewWorkspace = pathname === "/workspace/new";

    const handleNavClick = (e: React.MouseEvent) => {
        if (unsavedChanges) {
            const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
            if (!confirmed) {
                e.preventDefault();
            } else {
                setUnsavedChanges(false);
            }
        }
    };

    return (
        <header
            style={{
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                background: 'transparent',
                zIndex: 100
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link
                    href="/"
                    onClick={handleNavClick}
                    style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--text-muted)',
                        textDecoration: 'none',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                    Workspaces
                </Link>
                <ChevronRight size={14} color="var(--text-muted)" />

                {currentWorkspace && (
                    <>
                        <Link
                            href={`/w/${currentWorkspace.id}`}
                            onClick={handleNavClick}
                            style={{
                                fontSize: '14px',
                                fontWeight: pathname === `/w/${currentWorkspace.id}` ? 600 : 500,
                                color: pathname === `/w/${currentWorkspace.id}` ? 'var(--foreground)' : 'var(--text-muted)',
                                textDecoration: 'none',
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => e.currentTarget.style.color = 'var(--accent)'}
                            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => e.currentTarget.style.color = pathname === `/w/${currentWorkspace.id}` ? 'var(--foreground)' : 'var(--text-muted)'}
                        >
                            {currentWorkspace.name}
                        </Link>

                        {/* Page Breadcrumb */}
                        {(() => {
                            const segments = pathname.split("/").filter(Boolean);
                            if (segments.length >= 3 && segments[0] === "w" && segments[1] === currentWorkspace.id) {
                                const page = segments[2];
                                const labelMap: Record<string, string> = {
                                    flows: "Flows",
                                    knowledge: "Knowledge",
                                    handoffs: "Handoffs",
                                    team: "Team",
                                    "user-documents": "User Documents",
                                    settings: "Settings",
                                };
                                const label = labelMap[page] || page.charAt(0).toUpperCase() + page.slice(1);
                                return (
                                    <>
                                        <ChevronRight size={14} color="var(--text-muted)" />
                                        <Link
                                            href={pathname}
                                            style={{
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: 'var(--foreground)',
                                                textDecoration: 'none'
                                            }}
                                        >
                                            {label}
                                        </Link>
                                    </>
                                );
                            }
                            return null;
                        })()}
                    </>
                )}

                {!currentWorkspace && isNewWorkspace && (
                    <Link
                        href="/workspace/new"
                        onClick={handleNavClick}
                        style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            textDecoration: 'none'
                        }}
                    >
                        New
                    </Link>
                )}

                {!currentWorkspace && !isNewWorkspace && (
                    <Link
                        href="/"
                        onClick={handleNavClick}
                        style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            textDecoration: 'none'
                        }}
                    >
                        Home
                    </Link>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* UserMenu moved to Sidebar */}
            </div>
        </header>
    );
}
