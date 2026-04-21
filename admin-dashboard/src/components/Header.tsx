"use client";

import React from "react";
import Link from "next/link";
import { UserMenu } from "./UserMenu";
import { useWorkspace } from "./WorkspaceContext";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

export function Header() {
    const { currentWorkspace } = useWorkspace();
    const pathname = usePathname();

    const isNewWorkspace = pathname === "/workspace/new";

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

                {currentWorkspace ? (
                    <Link
                        href={`/w/${currentWorkspace.id}`}
                        style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            textDecoration: 'none',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => e.currentTarget.style.color = 'var(--foreground)'}
                    >
                        {currentWorkspace.name}
                    </Link>
                ) : isNewWorkspace ? (
                    <Link
                        href="/workspace/new"
                        style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            textDecoration: 'none'
                        }}
                    >
                        New
                    </Link>
                ) : (
                    <Link
                        href="/"
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
                <UserMenu />
            </div>
        </header>
    );
}
