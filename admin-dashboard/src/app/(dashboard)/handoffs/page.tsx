"use client";

import { useEffect, useState } from "react";
import { 
  Inbox, 
  User, 
  Clock, 
  MessageSquare, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function HandoffInbox() {
  const [handoffs, setHandoffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHandoffs() {
      try {
        const res = await fetch("/api/handoffs");
        if (res.ok) {
          const data = await res.json();
          setHandoffs(data);
        }
      } catch (err) {
        console.error("Failed to fetch handoffs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHandoffs();
  }, []);

  return (
    <>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px' }}>Handoff Inbox</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Manage situations where the AI requires human intervention.</p>
      </header>

      <div className="card glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Inbox color="#f59e0b" />
          <h2 style={{ margin: 0 }}>Active Requests</h2>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>Loading active requests...</p>
        ) : handoffs.length > 0 ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {handoffs.map((h, i) => (
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
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Sender: {h.sender_id.substring(0, 12)}...</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                      <Clock size={14} /> {new Date(h.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '12px', 
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <p style={{ fontSize: '14px', fontStyle: 'italic', color: 'rgba(255,255,255,0.8)' }}>
                      "{h.user_message}"
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn" style={{ fontSize: '13px' }}>Open Chat</button>
                    <button className="btn btn-secondary" style={{ fontSize: '13px' }}>Mark as Resolved</button>
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
                    SCORE: {Math.round(h.confidence_score * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <CheckCircle2 size={48} color="#22c55e" style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3 style={{ color: 'rgba(255,255,255,0.5)' }}>All caught up!</h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>No users currently waiting for human help.</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '40px' }} className="card glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <AlertCircle color="rgba(255,255,255,0.4)" size={20} />
          <h3 style={{ margin: 0, fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>Handoff Logic Note</h3>
        </div>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6' }}>
          The bot automatically flags conversations for human intervention when the Retrieval Confidence falls below 0.6. 
          The higher the score, the more certain the AI is about its response based on your Knowledge Base.
        </p>
      </div>
    </>
  );
}
