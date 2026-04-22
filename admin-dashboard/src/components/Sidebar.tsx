"use client";

import Link from "next/link";
import { useWorkspace } from "./WorkspaceContext";
import { Layout, Users, Settings, MessageSquare, Database, Inbox } from "lucide-react";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, unsavedChanges, setUnsavedChanges } = useWorkspace();
  const pathname = usePathname();

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

  // Determine if we are "Inside" a bot's building sections
  const isInsideBot = pathname.includes('/flows') ||
    pathname.includes('/knowledge') ||
    pathname.includes('/analytics') ||
    pathname.includes('/handoffs');

  const wsId = currentWorkspace?.id;

  return (
    <aside className="sidebar glass" style={{ width: '260px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Logo */}
      <div style={{ padding: '0 8px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: 'linear-gradient(135deg, var(--accent), #6366f1)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '20px'
        }}>
          A
        </div>
      </div>

      {/* 2. Workspace Gallery */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Link
          href="/"
          onClick={(e) => {
            handleNavClick(e);
            if (!e.defaultPrevented) setCurrentWorkspace(null);
          }}
          className="nav-item"
          style={{
            background: pathname === '/' ? 'var(--accent-alpha)' : 'transparent',
            fontWeight: 600,
            fontSize: '15px',
            padding: '10px 12px'
          }}
        >
          <Layout size={18} /> Workspace Gallery
        </Link>
      </nav>

      {/* Workspace Context - Hide if on root gallery or new workspace page */}
      {currentWorkspace && pathname !== '/' && pathname !== '/workspace/new' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <Link
            href={`/w/${wsId}`}
            onClick={handleNavClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: pathname === `/w/${wsId}` ? 'var(--accent-alpha)' : 'var(--nav-hover)',
              color: 'var(--foreground)',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '4px',
              border: '1px solid var(--card-border)'
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              background: 'var(--accent)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>
              {currentWorkspace.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentWorkspace.name}</span>
          </Link>

          {/* Navigation Items (Visible when in workspace) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Link href={`/w/${wsId}/flows`} onClick={handleNavClick} className={`nav-item ${pathname.includes('/flows') ? 'active' : ''}`} style={{ fontSize: '13px', padding: '8px 12px' }}>
              <MessageSquare size={16} /> Flows
            </Link>
            <Link href={`/w/${wsId}/knowledge`} onClick={handleNavClick} className={`nav-item ${pathname.includes('/knowledge') ? 'active' : ''}`} style={{ fontSize: '13px', padding: '8px 12px' }}>
              <Database size={16} /> Knowledge
            </Link>
            <Link href={`/w/${wsId}/handoffs`} onClick={handleNavClick} className={`nav-item ${pathname.includes('/handoffs') ? 'active' : ''}`} style={{ fontSize: '13px', padding: '8px 12px' }}>
              <Inbox size={16} /> Handoff Inbox
            </Link>
            <Link href={`/w/${wsId}/team`} onClick={handleNavClick} className={`nav-item ${pathname.includes('/team') ? 'active' : ''}`} style={{ fontSize: '13px', padding: '8px 12px' }}>
              <Users size={16} /> Members
            </Link>
            <Link href={`/w/${wsId}/settings`} onClick={handleNavClick} className={`nav-item ${pathname.includes('/settings') ? 'active' : ''}`} style={{ fontSize: '13px', padding: '8px 12px' }}>
              <Settings size={16} /> Settings
            </Link>
          </div>
        </div>
      )}

    </aside>
  );
}
