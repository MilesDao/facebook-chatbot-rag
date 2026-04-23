"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/auth";
import { FileText, Download, User } from "lucide-react";

interface UserDocument {
    id: string;
    sender_id: string;
    pdf_url: string;
    created_at: string;
}

export default function UserDocumentsPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;
    const [documents, setDocuments] = useState<UserDocument[]>([]);
    const [senderNames, setSenderNames] = useState<Record<string, { name: string; profile_pic: string }>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!workspaceId) return;

        const fetchDocuments = async () => {
            setLoading(true);
            try {
                const res = await apiFetch("/api/user-documents");
                if (res.ok) {
                    const data = await res.json();
                    setDocuments(data || []);

                    // Fetch real names from Facebook Graph API
                    if (data && data.length > 0) {
                        const uniqueIds = [...new Set(data.map((d: any) => d.sender_id))];
                        const nameRes = await apiFetch("/api/facebook/resolve-names", {
                            method: "POST",
                            body: JSON.stringify({ sender_ids: uniqueIds })
                        });
                        if (nameRes.ok) {
                            const nameData = await nameRes.json();
                            setSenderNames(nameData.names || {});
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching documents:", err);
            }
            setLoading(false);
        };

        fetchDocuments();
    }, [workspaceId]);

    const displayName = (psid: string) => {
        const info = senderNames[psid];
        if (info?.name) {
            return info.name;
        }
        return psid;
    };

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                <div>
                    <h1 style={{ fontSize: "32px", fontWeight: 700, margin: 0 }}>User Documents</h1>
                    <p style={{ color: "var(--foreground)", opacity: 0.7, marginTop: "8px" }}>
                        Generated PDFs from images uploaded by users.
                    </p>
                </div>
            </div>

            <div style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                overflow: "hidden"
            }}>
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "var(--foreground-muted)" }}>
                        Loading documents...
                    </div>
                ) : documents.length === 0 ? (
                    <div style={{ padding: "60px 40px", textAlign: "center" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "32px", background: "var(--bg-gradient-2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                            <FileText size={28} color="white" />
                        </div>
                        <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>No documents found</h3>
                        <p style={{ color: "var(--foreground)", opacity: 0.7, maxWidth: 400, margin: "0 auto" }}>
                            When users send images through Messenger, they will be combined into a PDF and appear here.
                        </p>
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                                <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: "14px" }}>User / Sender ID</th>
                                <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: "14px" }}>Date</th>
                                <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: "14px", textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((doc) => (
                                <tr key={doc.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "16px 24px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            {senderNames[doc.sender_id]?.profile_pic ? (
                                                <img
                                                    src={senderNames[doc.sender_id].profile_pic}
                                                    alt="Profile"
                                                    style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
                                                />
                                            ) : (
                                                <div style={{ background: "rgba(0,0,0,0.05)", padding: "10px", borderRadius: "10px" }}>
                                                    <User size={16} />
                                                </div>
                                            )}
                                            <span style={{ fontWeight: 500 }}>{displayName(doc.sender_id)}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "16px 24px", color: "var(--foreground-muted)", fontSize: "14px" }}>
                                        {new Date(doc.created_at).toLocaleString()}
                                    </td>
                                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                        <a
                                            href={doc.pdf_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                padding: "8px 16px",
                                                background: "var(--button-bg)",
                                                color: "white",
                                                borderRadius: "8px",
                                                textDecoration: "none",
                                                fontSize: "14px",
                                                fontWeight: 500
                                            }}
                                        >
                                            <Download size={14} /> Open PDF
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
