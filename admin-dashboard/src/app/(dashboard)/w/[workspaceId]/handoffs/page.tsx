"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { useLanguage } from "@/components/LanguageContext";
import {
  Inbox,
  User,
  Clock,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Trash2,
  Pause,
  Play
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { apiFetch } from "@/lib/auth";

export default function HandoffInbox() {
  const { t } = useLanguage();
  const { currentWorkspace } = useWorkspace();
  const [handoffs, setHandoffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSenders, setExpandedSenders] = useState<Record<string, boolean>>({});
  const [selectedResolved, setSelectedResolved] = useState<Set<string>>(new Set());
  const [senderNames, setSenderNames] = useState<Record<string, { name: string; profile_pic: string }>>({});
  const [pausedSenders, setPausedSenders] = useState<Set<string>>(new Set());

  const fetchHandoffs = async () => {
    try {
      const res = await apiFetch("/api/handoffs");
      if (res.ok) {
        const data = await res.json();
        setHandoffs(data);

        // Resolve sender names for any new PSIDs
        const uniqueIds = [...new Set(data.map((h: any) => h.sender_id))] as string[];
        const unknownIds = uniqueIds.filter(id => !senderNames[id]);
        if (unknownIds.length > 0) {
          try {
            const nameRes = await apiFetch("/api/facebook/resolve-names", {
              method: "POST",
              body: JSON.stringify({ sender_ids: unknownIds })
            });
            if (nameRes.ok) {
              const nameData = await nameRes.json();
              setSenderNames(prev => ({ ...prev, ...nameData.names }));
            }
          } catch (err) {
            console.error("Failed to resolve sender names:", err);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch handoffs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper: get display name for a sender ID
  const displayName = (psid: string) => {
    const info = senderNames[psid];
    if (info?.name && info.name !== psid) {
      return `${info.name} (${psid.substring(0, 8)}...)`;
    }
    return `${psid.substring(0, 14)}...`;
  };

  useEffect(() => {
    if (currentWorkspace) {
      fetchHandoffs();
      // Fetch paused senders
      apiFetch("/api/senders/paused")
        .then(res => res.ok ? res.json() : [])
        .then(data => setPausedSenders(new Set(data.map((d: any) => d.sender_id))))
        .catch(err => console.error("Failed to fetch paused senders:", err));
    }
  }, [currentWorkspace?.id]);

  const togglePause = async (senderId: string) => {
    const isPaused = pausedSenders.has(senderId);
    try {
      if (isPaused) {
        await apiFetch(`/api/senders/${senderId}/pause`, { method: "DELETE" });
        setPausedSenders(prev => { const next = new Set(prev); next.delete(senderId); return next; });
      } else {
        await apiFetch(`/api/senders/${senderId}/pause`, { method: "POST" });
        setPausedSenders(prev => new Set(prev).add(senderId));
      }
    } catch (err) {
      console.error("Failed to toggle pause:", err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await apiFetch(`/api/handoffs/${id}/resolve`, { method: "PUT" });
    } catch (err) {
      console.error("Failed to resolve handoff:", err);
    }
  };

  const handleResolveAndRefresh = async (id: string) => {
    await handleResolve(id);
    await fetchHandoffs();
  };

  const handleResolveAll = async (ids: string[]) => {
    await Promise.all(ids.map(id => handleResolve(id)));
    await fetchHandoffs();
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await apiFetch(`/api/handoffs/${id}/restore`, { method: "PUT" });
      if (res.ok) await fetchHandoffs();
    } catch (err) {
      console.error("Failed to restore handoff:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("handoff.deleteConfirm"))) return;
    try {
      const res = await apiFetch(`/api/handoffs/${id}`, { method: "DELETE" });
      if (res.ok) await fetchHandoffs();
    } catch (err) {
      console.error("Failed to delete handoff:", err);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedResolved.size === 0) return;
    if (!confirm(t("handoff.deleteConfirm"))) return;
    try {
      await Promise.all(
        Array.from(selectedResolved).map(id =>
          apiFetch(`/api/handoffs/${id}`, { method: "DELETE" })
        )
      );
      setSelectedResolved(new Set());
      await fetchHandoffs();
    } catch (err) {
      console.error("Failed to delete selected handoffs:", err);
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedResolved.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedResolved).map(id =>
          apiFetch(`/api/handoffs/${id}/restore`, { method: "PUT" })
        )
      );
      setSelectedResolved(new Set());
      await fetchHandoffs();
    } catch (err) {
      console.error("Failed to restore selected handoffs:", err);
    }
  };

  const toggleSelectGroup = (ids: string[]) => {
    setSelectedResolved(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) {
        ids.forEach(id => next.delete(id));
      } else {
        ids.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedResolved.size === resolved.length) {
      setSelectedResolved(new Set());
    } else {
      setSelectedResolved(new Set(resolved.map(h => h.id)));
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

  // Group active handoffs by sender_id
  const groupedActive = useMemo(() => {
    const groups: Record<string, any[]> = {};
    active.forEach(h => {
      if (!groups[h.sender_id]) groups[h.sender_id] = [];
      groups[h.sender_id].push(h);
    });
    return Object.entries(groups).map(([senderId, items]) => ({
      senderId,
      items: items.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      latestMessage: items[0].user_message,
      latestTime: items[0].created_at,
      avgScore: items.reduce((sum: number, h: any) => sum + h.confidence_score, 0) / items.length
    }));
  }, [active]);

  // Group resolved handoffs by sender_id
  const groupedResolved = useMemo(() => {
    const groups: Record<string, any[]> = {};
    resolved.forEach(h => {
      if (!groups[h.sender_id]) groups[h.sender_id] = [];
      groups[h.sender_id].push(h);
    });
    return Object.entries(groups).map(([senderId, items]) => ({
      senderId,
      items: items.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      allIds: items.map((h: any) => h.id),
      latestMessage: items[0].user_message,
      latestTime: items[0].created_at,
    }));
  }, [resolved]);

  const toggleSender = (senderId: string) => {
    setExpandedSenders(prev => ({ ...prev, [senderId]: !prev[senderId] }));
  };

  return (
    <>
      <header style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Inbox size={32} color="#f59e0b" />
          <h1 style={{ fontSize: '32px', color: 'var(--foreground)', margin: 0 }}>{t("nav.handoffs")}</h1>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>{t("handoff.desc")}</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Active Inbox — Grouped by Sender */}
        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Inbox color="#f59e0b" />
            <h2 style={{ margin: 0, color: 'var(--foreground)' }}>{t("handoff.active")}</h2>
            {groupedActive.length > 0 && (
              <span style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 'bold'
              }}>
                {groupedActive.length}
              </span>
            )}
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t("handoff.loading")}</p>
          ) : groupedActive.length > 0 ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {groupedActive.map((group) => (
                <div key={group.senderId} className="glass" style={{ padding: '0', overflow: 'hidden' }}>
                  {/* Sender Header — clickable to expand */}
                  <div
                    onClick={() => toggleSender(group.senderId)}
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      padding: '10px',
                      borderRadius: '12px',
                      color: '#f59e0b',
                      flexShrink: 0
                    }}>
                      <User size={22} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--foreground)' }}>
                          {displayName(group.senderId)}
                        </h3>
                        <span style={{
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: '#f59e0b',
                          padding: '1px 8px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {group.items.length} {t("handoff.messages")}
                        </span>
                        {pausedSenders.has(group.senderId) && (
                          <span style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#ef4444',
                            padding: '1px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Pause size={10} /> {t("handoff.paused")}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        "{group.latestMessage}"
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>
                        {t("handoff.score")}: {Math.round(group.avgScore * 100)}%
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <Clock size={13} /> {new Date(group.latestTime).toLocaleString()}
                      </div>
                      {expandedSenders[group.senderId] ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
                    </div>
                  </div>

                  {/* Expanded: individual messages */}
                  {expandedSenders[group.senderId] && (
                    <div style={{ borderTop: '1px solid var(--card-border)', padding: '12px 20px 16px' }}>
                      {/* Action buttons for this sender */}
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                        <button onClick={() => handleOpenChat(group.items[0].id, group.senderId)} className="btn" style={{ fontSize: '13px' }}>
                          {t("handoffs.openInInbox")}
                        </button>
                        <button
                          onClick={() => togglePause(group.senderId)}
                          className="btn"
                          style={{
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: pausedSenders.has(group.senderId) ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: pausedSenders.has(group.senderId) ? '#22c55e' : '#ef4444',
                            border: `1px solid ${pausedSenders.has(group.senderId) ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          }}
                        >
                          {pausedSenders.has(group.senderId) ? <Play size={14} /> : <Pause size={14} />}
                          {pausedSenders.has(group.senderId) ? t("handoff.resumeAI") : t("handoff.pauseAI")}
                        </button>
                        <button
                          onClick={() => handleResolveAll(group.items.map((h: any) => h.id))}
                          className="btn btn-secondary"
                          style={{ fontSize: '13px' }}
                        >
                          {t("handoffs.resolve")}
                        </button>
                      </div>

                      {/* Individual messages */}
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {group.items.map((h: any) => (
                          <div key={h.id} style={{
                            background: 'var(--nav-hover)',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--card-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <p style={{ fontSize: '14px', fontStyle: 'italic', color: 'var(--text-muted)', margin: 0, flex: 1 }}>
                              "{h.user_message}"
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                              <span>{Math.round(h.confidence_score * 100)}%</span>
                              <span>·</span>
                              <span>{new Date(h.created_at).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

        {/* Resolved Queue — Grouped by Sender with Select, Delete & Restore */}
        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <CheckCircle2 color="#22c55e" />
            <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--foreground)' }}>{t("handoff.resolved")}</h2>
            {resolved.length > 0 && (
              <span style={{
                background: 'rgba(34, 197, 94, 0.12)',
                color: '#22c55e',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 'bold'
              }}>
                {groupedResolved.length}
              </span>
            )}
          </div>

          {/* Select All + Restore/Delete Selected toolbar */}
          {resolved.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              marginBottom: '12px',
              borderRadius: '8px',
              background: selectedResolved.size > 0 ? 'rgba(168, 85, 247, 0.04)' : 'var(--nav-hover)',
              border: `1px solid ${selectedResolved.size > 0 ? 'rgba(168, 85, 247, 0.2)' : 'var(--card-border)'}`,
              transition: 'all 0.15s'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={resolved.length > 0 && selectedResolved.size === resolved.length}
                  onChange={toggleSelectAll}
                  style={{ accentColor: 'var(--accent)', width: '15px', height: '15px', cursor: 'pointer' }}
                />
                {selectedResolved.size > 0
                  ? `${selectedResolved.size} selected`
                  : "Select all"}
              </label>
              {selectedResolved.size > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleRestoreSelected}
                    className="btn btn-secondary"
                    style={{
                      fontSize: '11px',
                      padding: '4px 12px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RotateCcw size={12} />
                    {t("handoff.restore")} {selectedResolved.size}
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="btn btn-secondary"
                    style={{
                      fontSize: '11px',
                      padding: '4px 12px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#ef4444',
                      borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    <Trash2 size={12} />
                    {t("handoff.delete")} {selectedResolved.size}
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {groupedResolved.map((group) => {
              const isGroupSelected = group.allIds.every((id: string) => selectedResolved.has(id));
              const resolvedSenderKey = `resolved-${group.senderId}`;
              return (
                <div key={group.senderId} style={{
                  background: isGroupSelected ? 'rgba(168, 85, 247, 0.04)' : 'var(--nav-hover)',
                  borderRadius: '8px',
                  border: `1px solid ${isGroupSelected ? 'rgba(168, 85, 247, 0.2)' : 'var(--card-border)'}`,
                  overflow: 'hidden',
                  transition: 'all 0.15s'
                }}>
                  {/* Sender header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px' }}>
                    <input
                      type="checkbox"
                      checked={isGroupSelected}
                      onChange={() => toggleSelectGroup(group.allIds)}
                      style={{ accentColor: 'var(--accent)', width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div
                      onClick={() => toggleSender(resolvedSenderKey)}
                      style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--foreground)' }}>
                          {displayName(group.senderId)}
                        </span>
                        <span style={{
                          background: 'rgba(34, 197, 94, 0.12)',
                          color: '#22c55e',
                          padding: '1px 7px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {group.items.length} {t("handoff.messages")}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(group.latestTime).toLocaleDateString()}
                        </span>
                        {expandedSenders[resolvedSenderKey]
                          ? <ChevronDown size={16} color="var(--text-muted)" />
                          : <ChevronRight size={16} color="var(--text-muted)" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded: messages + actions */}
                  {expandedSenders[resolvedSenderKey] && (
                    <div style={{ borderTop: '1px solid var(--card-border)', padding: '10px 12px 12px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <button onClick={() => handleOpenChat(group.items[0].id, group.senderId)} className="btn" style={{ fontSize: '11px', padding: '4px 10px', height: '26px' }}>
                          {t("handoffs.openInInbox")}
                        </button>
                        <button
                          onClick={async () => {
                            await Promise.all(group.allIds.map((id: string) => apiFetch(`/api/handoffs/${id}/restore`, { method: "PUT" })));
                            await fetchHandoffs();
                          }}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 10px', height: '26px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <RotateCcw size={12} /> {t("handoffs.restore")}
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(t("handoff.deleteConfirm"))) return;
                            await Promise.all(group.allIds.map((id: string) => apiFetch(`/api/handoffs/${id}`, { method: "DELETE" })));
                            setSelectedResolved(prev => {
                              const next = new Set(prev);
                              group.allIds.forEach((id: string) => next.delete(id));
                              return next;
                            });
                            await fetchHandoffs();
                          }}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 10px', height: '26px', display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        >
                          <Trash2 size={12} /> {t("common.delete")}
                        </button>
                      </div>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        {group.items.map((h: any) => (
                          <div key={h.id} style={{
                            background: 'var(--background)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--card-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '10px'
                          }}>
                            <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)', margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              "{h.user_message}"
                            </p>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                              {new Date(h.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
