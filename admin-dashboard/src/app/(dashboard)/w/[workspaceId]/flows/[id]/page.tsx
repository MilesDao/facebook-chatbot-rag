"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Connection,
    Edge,
    Node,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    BackgroundVariant,
    MiniMap,
    useReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
    ArrowLeft,
    Save,
    MessageSquare,
    Database,
    UserRound,
    Zap,
    CheckCircle,
    GripVertical,
} from "lucide-react";

import { apiFetch } from "@/lib/auth";
import { useWorkspace } from "@/components/WorkspaceContext";
import { MessageNode, LogicNode, RAGNode, HandoffNode } from "@/components/FlowNodes";

// Define custom node types
const nodeTypes = {
    message: MessageNode,
    logic: LogicNode,
    rag: RAGNode,
    handoff: HandoffNode,
};

function FlowEditorContent() {
    const { id } = useParams();
    const router = useRouter();
    const { currentWorkspace } = useWorkspace();
    const { screenToFlowPosition } = useReactFlow();

    const [name, setName] = useState("");
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const onDeleteNode = useCallback((nodeId: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    }, []);

    const onNodeDataChange = useCallback((nodeId: string, field: string, value: any) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            [field]: value,
                        },
                    };
                }
                return node;
            })
        );
    }, []);

    useEffect(() => {
        if (id === "new") {
            setNodes([
                {
                    id: "start",
                    type: "message",
                    position: { x: 250, y: 150 },
                    data: {
                        content: "Xin chào! Bạn cần hỗ trợ gì ạ?",
                        onDelete: onDeleteNode,
                        onChange: onNodeDataChange
                    }
                }
            ]);
            setLoading(false);
            return;
        }

        async function fetchFlow() {
            try {
                const res = await apiFetch(`/api/flows/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setName(data.name);
                    const enrichedNodes = (data.nodes || []).map((n: any) => ({
                        ...n,
                        data: {
                            ...n.data,
                            onDelete: onDeleteNode,
                            onChange: onNodeDataChange
                        }
                    }));
                    setNodes(enrichedNodes);
                    setEdges(data.edges || []);
                }
            } catch (err) {
                console.error("Failed to fetch flow:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchFlow();
    }, [id, onDeleteNode, onNodeDataChange]);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    const onConnect: OnConnect = useCallback(
        (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--accent)', strokeWidth: 3 } }, eds)),
        []
    );

    // Drag and Drop Logic
    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: `node_${Date.now()}`,
                type,
                position,
                data: {
                    content: type === 'message' ? "New message..." : "",
                    keyword: type === 'logic' ? "vấn đề" : "",
                    onDelete: onDeleteNode,
                    onChange: onNodeDataChange
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [screenToFlowPosition, onDeleteNode, onNodeDataChange]
    );

    const handleSave = async () => {
        if (!currentWorkspace) return;
        setSaving(true);
        try {
            const payload = {
                name: name || "Untitled Flow",
                nodes: nodes.map(n => ({
                    ...n,
                    data: Object.fromEntries(Object.entries(n.data).filter(([k]) => k !== 'onDelete' && k !== 'onChange'))
                })),
                edges,
                is_active: true
            };
            const method = id === "new" ? "POST" : "PUT";
            const url = id === "new" ? "/api/flows" : `/api/flows/${id}`;

            const res = await apiFetch(url, {
                method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                if (id === "new") {
                    const result = await res.json();
                    router.push(`/w/${currentWorkspace.id}/flows/${result.data.id}`);
                }
            }
        } catch (err) {
            console.error("Failed to save flow:", err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Pro Flow Editor...</div>;

    return (
        <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 24px',
                background: 'var(--card-bg)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid var(--card-border)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => router.push(`/w/${currentWorkspace?.id}/flows`)}
                        style={{ background: 'var(--nav-hover)', border: 'none', color: 'var(--foreground)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name your flow..."
                        style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            background: 'none',
                            border: 'none',
                            color: 'var(--foreground)',
                            outline: 'none',
                            width: '300px'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {saveSuccess && (
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            <CheckCircle size={14} /> Saved
                        </div>
                    )}
                    <button
                        className="btn"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: '10px', fontWeight: '600' }}
                    >
                        <Save size={18} /> {saving ? "Saving..." : "Save Flow"}
                    </button>
                </div>
            </header>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* TOOLBOX SIDEBAR */}
                <aside style={{
                    width: '280px',
                    background: 'var(--card-bg)',
                    borderRight: '1px solid var(--card-border)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    zIndex: 5
                }}>
                    <div>
                        <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Toolbox</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>Drag and drop nodes onto the canvas to build your flow.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div
                                draggable
                                onDragStart={(e) => onDragStart(e, 'message')}
                                style={{ background: 'var(--nav-hover)', border: '1px solid var(--card-border)', padding: '12px', borderRadius: '12px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--foreground)' }}
                            >
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '8px' }}><MessageSquare size={18} color="#3b82f6" /></div>
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>Message</span>
                                <GripVertical size={14} style={{ marginLeft: 'auto', opacity: 0.3 }} />
                            </div>

                            <div
                                draggable
                                onDragStart={(e) => onDragStart(e, 'logic')}
                                style={{ background: 'var(--nav-hover)', border: '1px solid var(--card-border)', padding: '12px', borderRadius: '12px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--foreground)' }}
                            >
                                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '8px' }}><Zap size={18} color="#f59e0b" /></div>
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>Condition</span>
                                <GripVertical size={14} style={{ marginLeft: 'auto', opacity: 0.3 }} />
                            </div>

                            <div
                                draggable
                                onDragStart={(e) => onDragStart(e, 'rag')}
                                style={{ background: 'var(--nav-hover)', border: '1px solid var(--card-border)', padding: '12px', borderRadius: '12px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--foreground)' }}
                            >
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '8px' }}><Database size={18} color="#10b981" /></div>
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>AI Search</span>
                                <GripVertical size={14} style={{ marginLeft: 'auto', opacity: 0.3 }} />
                            </div>

                            <div
                                draggable
                                onDragStart={(e) => onDragStart(e, 'handoff')}
                                style={{ background: 'var(--nav-hover)', border: '1px solid var(--card-border)', padding: '12px', borderRadius: '12px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--foreground)' }}
                            >
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px' }}><UserRound size={18} color="#ef4444" /></div>
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>Handoff</span>
                                <GripVertical size={14} style={{ marginLeft: 'auto', opacity: 0.3 }} />
                            </div>
                        </div>
                    </div>
                </aside>

                <div style={{ flex: 1, position: 'relative' }} onDragOver={onDragOver} onDrop={onDrop}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        colorMode="system"
                        fitView
                    >
                        <Controls position="bottom-right" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '10px' }} />
                        <Background color="var(--card-border)" variant={BackgroundVariant.Lines} gap={30} />
                        <MiniMap
                            position="top-right"
                            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px' }}
                            maskColor="rgba(0,0,0,0.2)"
                            nodeStrokeColor={(n) => {
                                if (n.type === 'message') return '#3b82f6';
                                if (n.type === 'logic') return '#f59e0b';
                                if (n.type === 'rag') return '#10b981';
                                if (n.type === 'handoff') return '#ef4444';
                                return '#333';
                            }}
                            nodeColor="var(--card-bg)"
                        />
                    </ReactFlow>
                </div>
            </div>
        </div>
    );
}

export default function FlowEditor() {
    return (
        <ReactFlowProvider>
            <FlowEditorContent />
        </ReactFlowProvider>
    );
}
