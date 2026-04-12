"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  MessageCircle, 
  AlertCircle, 
  TrendingUp,
  Activity
} from "lucide-react";

export default function Overview() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    uniqueUsers: 0,
    avgConfidence: 0,
    handoffRate: 0
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
          
          if (data.length > 0) {
            const users = new Set(data.map((l: any) => l.sender_id));
            const handoffs = data.filter((l: any) => l.handoff_triggered).length;
            const avgConf = data.reduce((acc: number, l: any) => acc + l.confidence_score, 0) / data.length;
            
            setStats({
              totalMessages: data.length,
              uniqueUsers: users.size,
              avgConfidence: Math.round(avgConf * 100),
              handoffRate: Math.round((handoffs / data.length) * 100)
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      }
    }
    fetchData();
  }, []);

  return (
    <>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px' }}>System Overview</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Real-time performance metrics and bot health.</p>
      </header>

      <div className="stats-grid">
        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Total Interactions</p>
              <h2 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.totalMessages}</h2>
            </div>
            <MessageCircle color="#3b82f6" />
          </div>
        </div>

        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Active Users</p>
              <h2 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.uniqueUsers}</h2>
            </div>
            <Users color="#a855f7" />
          </div>
        </div>

        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Avg. Confidence</p>
              <h2 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.avgConfidence}%</h2>
            </div>
            <Activity color="#22c55e" />
          </div>
        </div>

        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Handoff Rate</p>
              <h2 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.handoffRate}%</h2>
            </div>
            <AlertCircle color="#ef4444" />
          </div>
        </div>
      </div>

      <div className="card glass">
        <h2>Recent Interactions</h2>
        <table>
          <thead>
            <tr>
              <th>Sender</th>
              <th>Message</th>
              <th>AI Reply</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(logs.length > 0 ? logs.slice(0, 10) : []).map((log, i) => (
              <tr key={i}>
                <td style={{ fontSize: '12px' }}>{log.sender_id.substring(0, 8)}...</td>
                <td>{log.user_message.substring(0, 30)}...</td>
                <td>{log.ai_reply.substring(0, 30)}...</td>
                <td>{Math.round(log.confidence_score * 100)}%</td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    background: log.handoff_triggered ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    color: log.handoff_triggered ? '#ef4444' : '#22c55e'
                  }}>
                    {log.handoff_triggered ? 'Handoff' : 'Auto'}
                  </span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No interaction data logged yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
