"use client";

import Link from "next/link";
import { useWorkspace } from "./WorkspaceContext";
import { Layout, Users, Settings, MessageSquare, Database, Inbox, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { usePathname } from "next/navigation";
import { UserMenu } from "./UserMenu";

export function Sidebar() {
  const { currentWorkspace, setCurrentWorkspace, unsavedChanges, setUnsavedChanges, isSidebarCollapsed, toggleSidebar } = useWorkspace();
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
    <aside className="sidebar glass" style={{
      width: isSidebarCollapsed ? '80px' : '260px',
      padding: isSidebarCollapsed ? '20px 12px' : '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden'
    }}>
      {/* 1. Logo & Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
        padding: '0 8px',
        position: 'relative'
      }}>
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
          fontSize: '20px',
          flexShrink: 0
        }}>
          A
        </div>

        {!isSidebarCollapsed && (
          <span style={{
            fontWeight: 800,
            fontSize: '18px',
            background: 'linear-gradient(135deg, var(--foreground), var(--text-muted))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginLeft: '12px',
            flex: 1
          }}>Chatbot AI</span>
        )}

        <button
          onClick={toggleSidebar}
          style={{
            background: 'var(--nav-hover)',
            border: '1px solid var(--card-border)',
            borderRadius: '6px',
            padding: '4px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: isSidebarCollapsed ? '0' : '4px',
            position: isSidebarCollapsed ? 'absolute' : 'relative',
            right: isSidebarCollapsed ? '-10px' : 'auto',
            top: isSidebarCollapsed ? '50px' : 'auto',
            zIndex: 10,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.background = 'var(--accent-alpha)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'var(--nav-hover)';
          }}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
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
            padding: '10px 12px',
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
          }}
        >
          <Layout size={18} /> {!isSidebarCollapsed && "Workspace Gallery"}
        </Link>
      </nav>

      {/* Workspace Context - Hide if on root gallery or new workspace page */}
      {currentWorkspace && pathname !== '/' && pathname !== '/workspace/new' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flex: 1,
          overflowY: 'auto',
          marginRight: isSidebarCollapsed ? '-4px' : '-8px',
          paddingRight: isSidebarCollapsed ? '4px' : '8px'
        }} className="custom-scrollbar">
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
              border: '1px solid var(--card-border)',
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
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
              fontSize: '12px',
              flexShrink: 0
            }}>
              {currentWorkspace.name.charAt(0).toUpperCase()}
            </div>
            {!isSidebarCollapsed && <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentWorkspace.name}</span>}
          </Link>

          {/* Navigation Items (Visible when in workspace) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Link href={`/w/${wsId}/flows`} onClick={handleNavClick} title={isSidebarCollapsed ? "Flows" : ""} className={`nav-item ${pathname.includes('/flows') ? 'active' : ''}`} style={{ fontSize: '13px', padding: '8px 12px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
              <MessageSquare size={16} /> {!isSidebarCollapsed && "Flows"}
            </Link>
            <Link href={`/w/${wsId}/knowledge`} onClick={handleNavClick} title={isSidebarCollapsed ? "Knowledge" : ""} className={`nav-item ${pathname.includes('/knowledge') ? 'active' : ''}`} style={{ fontSize: '13px', padding: '8px 12px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
              <Database size={16} /> {!isSidebarCollapsed && "Knowledge"}
            </Link>
            <Link href={`/w/${wsId}/handoffs`} onClick={handleNavClick} title={isSidebarCollapsed ? "Handoff Inbox" : ""} className={`nav-item ${pathname.includes('/handoffs') ? 'active' : ''}`} style={{ fontSize: '13px', padding: '8px 12px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
              <Inbox size={16} /> {!isSidebarCollapsed && "Handoff Inbox"}
            </Link>
            <Link href={`/w/${wsId}/user-documents`} onClick={handleNavClick} title={isSidebarCollapsed ? "User Documents" : ""} className={`nav-item ${pathname.includes('/user-documents') ? 'active' : ''}`} style={{ fontSize: '13px', padding: '8px 12px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
              <FileText size={16} /> {!isSidebarCollapsed && "User Documents"}
            </Link>
            <Link href={`/w/${wsId}/team`} onClick={handleNavClick} title={isSidebarCollapsed ? "Members" : ""} className={`nav-item ${pathname.includes('/team') ? 'active' : ''}`} style={{ fontSize: '13px', padding: '8px 12px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
              <Users size={16} /> {!isSidebarCollapsed && "Members"}
            </Link>
            <Link href={`/w/${wsId}/settings`} onClick={handleNavClick} title={isSidebarCollapsed ? "Settings" : ""} className={`nav-item ${pathname.includes('/settings') ? 'active' : ''}`} style={{ fontSize: '13px', padding: '8px 12px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
              <Settings size={16} /> {!isSidebarCollapsed && "Settings"}
            </Link>
          </div>
        </div>
      )}

      {/* 3. User & Profile */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '16px',
        borderTop: '1px solid var(--card-border)',
        display: 'flex',
        justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
        width: '100%'
      }}>
        <UserMenu />
      </div>

    </aside>
  );
}
