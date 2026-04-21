"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
    const { workspaceId } = useParams();
    const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();

    useEffect(() => {
        if (workspaceId && workspaces.length > 0) {
            const target = workspaces.find(ws => ws.id === workspaceId);
            if (target && target.id !== currentWorkspace?.id) {
                setCurrentWorkspace(target);
            }
        }
    }, [workspaceId, workspaces, currentWorkspace, setCurrentWorkspace]);

    return <>{children}</>;
}
