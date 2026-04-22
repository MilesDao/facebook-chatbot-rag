"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/auth";

interface Workspace {
    id: string;
    name: string;
    industry: string;
    owner_id: string;
    user_role: string;
    settings: Record<string, any>;
    created_at: string;
}

interface WorkspaceContextType {
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    setCurrentWorkspace: (ws: Workspace | null) => void;
    loading: boolean;
    refreshWorkspaces: () => Promise<void>;
    unsavedChanges: boolean;
    setUnsavedChanges: (val: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
    workspaces: [],
    currentWorkspace: null,
    setCurrentWorkspace: () => { },
    loading: true,
    refreshWorkspaces: async () => { },
    unsavedChanges: false,
    setUnsavedChanges: () => { },
});

export function useWorkspace() {
    return useContext(WorkspaceContext);
}

const WS_STORAGE_KEY = "active_workspace_id";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
    const [loading, setLoading] = useState(true);
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    const setCurrentWorkspace = useCallback((ws: Workspace | null) => {
        setCurrentWorkspaceState(ws);
        if (typeof window !== "undefined") {
            if (ws) {
                localStorage.setItem(WS_STORAGE_KEY, ws.id);
            } else {
                localStorage.removeItem(WS_STORAGE_KEY);
            }
        }
    }, []);

    const refreshWorkspaces = useCallback(async () => {
        try {
            const res = await apiFetch("/api/workspaces");
            if (res.ok) {
                const data = await res.json();
                setWorkspaces(data);

                // Restore last active workspace or pick first
                const savedId = typeof window !== "undefined" ? localStorage.getItem(WS_STORAGE_KEY) : null;
                const saved = data.find((ws: Workspace) => ws.id === savedId);
                if (saved) {
                    setCurrentWorkspaceState(saved);
                } else if (data.length > 0) {
                    setCurrentWorkspaceState(data[0]);
                    if (typeof window !== "undefined") {
                        localStorage.setItem(WS_STORAGE_KEY, data[0].id);
                    }
                }
            }
        } catch (e) {
            console.error("Error fetching workspaces:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshWorkspaces();
    }, [refreshWorkspaces]);

    return (
        <WorkspaceContext.Provider
            value={{ workspaces, currentWorkspace, setCurrentWorkspace, loading, refreshWorkspaces, unsavedChanges, setUnsavedChanges }}
        >
            {children}
        </WorkspaceContext.Provider>
    );
}
