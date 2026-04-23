"use client";

import React from "react";
import Link from "next/link";
import { Activity, Plus } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { useLanguage } from "@/components/LanguageContext";

export default function RootPage() {
  const { workspaces, setCurrentWorkspace } = useWorkspace();
  const { t } = useLanguage();

  React.useEffect(() => {
    setCurrentWorkspace(null);
  }, [setCurrentWorkspace]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '32px', fontWeight: 700 }}>
        {t('workspace.gallery')}
      </h1>

      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} /> {t('workspace.recentlyViewed')}
        </h2>
        {/* ĐÃ FIX: Đổi repeat(auto-fill, ...) thành repeat(3, 1fr) để ép nó luôn chia 3 cột dàn đều */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {workspaces.slice(0, 3).map(ws => (
            <Link
              key={ws.id}
              href={`/w/${ws.id}`}
              onClick={() => setCurrentWorkspace(ws)}
              style={{
                height: '120px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0079bf, #50a1d4)',
                padding: '16px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '18px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {ws.name}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--foreground)' }}>
          {t('workspace.yourWorkspaces')}
        </h2>
        {/* ĐÃ FIX: Tương tự, ép chia 3 cột dàn ngang tăm tắp */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {workspaces.map(ws => (
            <Link
              key={ws.id}
              href={`/w/${ws.id}`}
              onClick={() => setCurrentWorkspace(ws)}
              style={{
                height: '100px',
                borderRadius: '12px',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                padding: '16px',
                color: 'var(--foreground)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-alpha)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--card-bg)'}
            >
              <div style={{ width: '32px', height: '32px', background: 'var(--accent)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                {ws.name.charAt(0).toUpperCase()}
              </div>
              {ws.name}
            </Link>
          ))}
          
          <Link
            href="/workspace/new"
            style={{
              height: '100px',
              borderRadius: '12px',
              background: 'var(--card-bg)',
              border: '1px dashed var(--card-border)',
              padding: '16px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.background = 'var(--accent-alpha)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--card-border)';
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'var(--card-bg)';
            }}
          >
            <Plus size={24} />
            <span>{t('workspace.createNew')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}