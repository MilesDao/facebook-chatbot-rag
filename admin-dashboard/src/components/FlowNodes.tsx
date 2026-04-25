"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare, Zap, Database, UserRound, X, Sparkles } from 'lucide-react';

const nodeBaseStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--card-border)',
    borderRadius: '16px',
    padding: '0',
    width: '260px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s ease-in-out',
};

const headerStyle = (color: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: `linear-gradient(to right, ${color}22, transparent)`,
    borderBottom: '1px solid var(--card-border)',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: color,
});

const bodyStyle: React.CSSProperties = {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--nav-hover)',
    border: '1px solid var(--card-border)',
    borderRadius: '10px',
    padding: '10px 12px',
    color: 'var(--foreground)',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.2s',
};

const deleteButtonStyle: React.CSSProperties = {
    background: 'rgba(239, 68, 68, 0.1)',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
};

const handleStyle = (color: string): React.CSSProperties => ({
    width: '14px',
    height: '14px',
    background: color,
    border: '2px solid var(--card-bg)',
    boxShadow: `0 0 12px ${color}aa`,
    cursor: 'crosshair',
    pointerEvents: 'all',
    zIndex: 2
});

export const MessageNode = ({ id, data, selected }: any) => {
    const accent = "#3b82f6";
    return (
        <div style={{
            ...nodeBaseStyle,
            border: selected ? `1px solid ${accent}` : nodeBaseStyle.border,
            boxShadow: selected ? `0 0 30px ${accent}33` : nodeBaseStyle.boxShadow,
            transform: selected ? 'scale(1.02)' : 'scale(1)'
        }}>
            <div style={headerStyle(accent)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={14} />
                    <span>Message</span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
                    style={deleteButtonStyle}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                >
                    <X size={14} />
                </button>
            </div>
            <div style={bodyStyle}>
                <textarea
                    defaultValue={data.content || ""}
                    onBlur={(e) => data.onChange(id, 'content', e.target.value)}
                    placeholder="Type what the bot should say..."
                    style={{ ...inputStyle, minHeight: '80px', resize: 'none' }}
                />
            </div>
            <Handle type="target" position={Position.Left} style={handleStyle(accent)} />
            <Handle type="source" position={Position.Right} style={handleStyle(accent)} />
            {selected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accent }} />}
        </div>
    );
};

export const LogicNode = ({ id, data, selected }: any) => {
    const accent = "#f59e0b";
    return (
        <div style={{
            ...nodeBaseStyle,
            border: selected ? `1px solid ${accent}` : nodeBaseStyle.border,
            boxShadow: selected ? `0 0 30px ${accent}33` : nodeBaseStyle.boxShadow,
            transform: selected ? 'scale(1.02)' : 'scale(1)'
        }}>
            <div style={headerStyle(accent)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={14} />
                    <span>Logic</span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
                    style={deleteButtonStyle}
                >
                    <X size={14} />
                </button>
            </div>
            <div style={bodyStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>IF INPUT CONTAINS</label>
                    <input
                        type="text"
                        defaultValue={data.keyword || ""}
                        onBlur={(e) => data.onChange(id, 'keyword', e.target.value)}
                        placeholder="Search keyword..."
                        style={inputStyle}
                    />
                </div>
            </div>
            <Handle id="rag-in" type="target" position={Position.Left} style={handleStyle(accent)} isConnectable />
            <Handle id="rag-out" type="source" position={Position.Right} style={handleStyle(accent)} isConnectable />
        </div>
    );
};

export const RAGNode = ({ id, data, selected }: any) => {
    const accent = "#10b981";
    return (
        <div style={{
            ...nodeBaseStyle,
            border: selected ? `1px solid ${accent}` : nodeBaseStyle.border,
            boxShadow: selected ? `0 0 30px ${accent}33` : nodeBaseStyle.boxShadow,
            transform: selected ? 'scale(1.02)' : 'scale(1)'
        }}>
            <div style={headerStyle(accent)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={14} />
                    <span>Knowledge Search</span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
                    style={deleteButtonStyle}
                >
                    <X size={14} />
                </button>
            </div>
            <div style={bodyStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <Sparkles size={16} color={accent} />
                    <span style={{ color: 'var(--foreground)' }}>Smart AI Answering</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                    Uses RAG to find answers in your uploaded documents.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>REPEAT COUNT (0 = INFINITE)</label>
                    <input
                        type="number"
                        min={0}
                        defaultValue={data.repeat_count ?? 1}
                        onBlur={(e) => data.onChange(id, 'repeat_count', Number(e.target.value))}
                        placeholder="1"
                        style={inputStyle}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>APPEND MESSAGE (OPTIONAL)</label>
                    <textarea
                        defaultValue={data.append_text || ""}
                        onBlur={(e) => data.onChange(id, 'append_text', e.target.value)}
                        placeholder="Add a follow-up line (e.g. để lại sdt mình tư vấn...)"
                        style={{ ...inputStyle, minHeight: '60px', resize: 'none' }}
                    />
                </div>
            </div>
            <Handle type="target" position={Position.Left} style={handleStyle(accent)} />
            <Handle type="source" position={Position.Right} style={handleStyle(accent)} />
        </div>
    );
};

export const HandoffNode = ({ id, data, selected }: any) => {
    const accent = "#ef4444";
    return (
        <div style={{
            ...nodeBaseStyle,
            border: selected ? `1px solid ${accent}` : nodeBaseStyle.border,
            boxShadow: selected ? `0 0 30px ${accent}33` : nodeBaseStyle.boxShadow,
            transform: selected ? 'scale(1.02)' : 'scale(1)'
        }}>
            <div style={headerStyle(accent)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserRound size={14} />
                    <span>Live Handoff</span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
                    style={deleteButtonStyle}
                >
                    <X size={14} />
                </button>
            </div>
            <div style={bodyStyle}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                    Pause AI and transfer the chat to a human agent immediately. No automated message will be sent.
                </div>
            </div>
            <Handle type="target" position={Position.Left} style={handleStyle(accent)} />
        </div>
    );
};
