"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import {
  Inbox,
  User,
  Clock,
  MessageSquare,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { apiFetch } from "@/lib/auth";

export default function HandoffInbox() {
  const { t } = useLanguage();
  const [handoffs, setHandoffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHandoffs = async () => {
    try {
      const res = await apiFetch("/api/handoffs");
      if (res.ok) {
        const data = await res.json();
        setHandoffs(data);
      }
    } catch (err) {
      console.error("Failed to fetch handoffs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandoffs();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      const res = await apiFetch(`/api/handoffs/${id}/resolve`, {
        method: "PUT"
      });
      if (res.ok) {
        await fetchHandoffs();
      }
    } catch (err) {
      console.error("Failed to resolve handoff:", err);
    }
  };

  const handleOpenChat = async (id: string, senderId: string) => {
    try {
      const res = await apiFetch(`/api/handoffs/${id}/chat-link`);
      if (res.ok) {
        const data = await res.json();
        if (data.link) {
          const finalLink = data.link.startsWith('/') ? `https://business.facebook.com${data.link}` : data.link;
          window.open(finalLink, '_blank');
          return;
        }
      }
    } catch (err) {
      console.error("Failed to fetch chat link:", err);
    }
    window.open(`https://business.facebook.com/latest/inbox/all?selected_item_id=${senderId}`, '_blank');
  };

  const active = handoffs.filter(h => h.status === 'active');
  const resolved = handoffs.filter(h => h.status === 'resolved');

  return (
    <>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', color: 'var(--foreground)' }}>{t("nav.handoffs")}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{t("handoff.desc")}</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Inbox color="#f59e0b" />
            <h2 style={{ margin: 0, color: 'var(--foreground)' }}>{t("handoff.active")}</h2>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t("handoff.loading")}</p>
          ) : active.length > 0 ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {active.map((h, i) => (
                <div key={i} className="glass" style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    padding: '12px',
                    borderRadius: '12px',
                    color: '#f59e0b'
                  }}>
                    <User size={24} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--foreground)' }}>{t("handoff.sender")}: {h.sender_id.substring(0, 12)}...</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <Clock size={14} /> {new Date(h.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div style={{
                      background: 'var(--nav-hover)',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      border: '1px solid var(--card-border)'
                    }}>
                      <p style={{ fontSize: '14px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        "{h.user_message}"
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => handleOpenChat(h.id, h.sender_id)} className="btn" style={{ fontSize: '13px' }}>{t("handoff.openChat")}</button>
                      <button onClick={() => handleResolve(h.id)} className="btn btn-secondary" style={{ fontSize: '13px' }}>{t("handoff.markResolved")}</button>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#ef4444',
                      background: 'rgba(239, 68, 68, 0.1)',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {t("handoff.score")}: {Math.round(h.confidence_score * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <CheckCircle2 size={48} color="#22c55e" style={{ opacity: 0.2, marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--text-muted)' }}>{t("handoff.emptyTitle")}</h3>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{t("handoff.emptyDesc")}</p>
            </div>
          )}
        </div>

        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <CheckCircle2 color="#22c55e" />
            <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--foreground)' }}>{t("handoff.resolved")}</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {resolved.map((h, i) => (
              <div key={i} style={{
                background: 'var(--nav-hover)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                opacity: 0.8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--foreground)' }}>{h.sender_id.substring(0, 10)}...</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(h.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px' }}>
                  {h.user_message}
                </p>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => handleOpenChat(h.id, h.sender_id)} className="btn" style={{ fontSize: '11px', padding: '4px 10px', height: '24px' }}>{t("handoff.openChat")}</button>
                </div>
              </div>
            ))}
            {resolved.length === 0 && !loading && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                -
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '40px' }} className="card glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <AlertCircle color="var(--text-muted)" size={20} />
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-muted)' }}>{t("handoff.logicNote")}</h3>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          {t("handoff.logicDesc")}
        </p>
      </div>
    </>
  );
}
