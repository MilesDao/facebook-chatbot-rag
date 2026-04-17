"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";
import {
  FileUp,
  Database,
  RefreshCw,
  FileText,
  Search,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { apiFetch } from "@/lib/auth";

export default function KnowledgeBase() {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sources, setSources] = useState<{ id: string, name: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const fetchSources = async () => {
    try {
      const res = await apiFetch("/api/sources");
      if (res.ok) {
        setSources(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch sources:", err);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleDeleteSource = async (filename: string) => {
    if (!confirm(t("knowledge.deleteConfirm"))) return;
    try {
      const res = await apiFetch(`/api/sources/${filename}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchSources();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setStatus(t("knowledge.uploading"));

    const formData = new FormData();
    files.forEach(f => {
      formData.append("file", f);
    });

    try {
      const res = await apiFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setStatus(t("knowledge.statusUploadSuccess"));
        setFiles([]);
        await fetchSources();
      } else {
        setStatus(t("knowledge.statusUploadFail"));
      }
    } catch (err) {
      console.error(err);
      setStatus(t("knowledge.statusError"));
    } finally {
      setUploading(false);
    }
  };

  const handleIndex = async () => {
    setIndexing(true);
    setStatus(t("knowledge.indexing"));

    try {
      const res = await apiFetch("/api/index", {
        method: "POST"
      });

      if (res.ok) {
        setStatus(t("knowledge.statusIndexSuccess"));
      } else {
        setStatus(t("knowledge.statusIndexFail"));
      }
    } catch (err) {
      console.error(err);
      setStatus(t("knowledge.statusError"));
    } finally {
      setIndexing(false);
    }
  };

  return (
    <>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', color: 'var(--foreground)' }}>{t("knowledge.title")}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{t("knowledge.desc")}</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <FileUp color="var(--accent)" />
            <h2 style={{ margin: 0, color: 'var(--foreground)' }}>{t("knowledge.addSource")}</h2>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px ${isDragging ? 'solid' : 'dashed'} ${isDragging ? 'var(--accent)' : 'var(--card-border)'}`,
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              marginBottom: '20px',
              background: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <FileText size={48} color={isDragging ? 'var(--accent)' : 'var(--text-muted)'} style={{ marginBottom: '16px', transition: 'all 0.2s ease' }} />
            <p style={{
              marginBottom: '16px',
              fontSize: '14px',
              pointerEvents: 'none',
              color: isDragging ? 'var(--accent)' : 'inherit',
              fontWeight: isDragging ? 'bold' : 'normal',
              transition: 'all 0.2s ease'
            }}>
              {isDragging ? t("knowledge.dropHere") : (files.length > 0 ? (
                files.length === 1 ? files[0].name : `${files.length} ${t("knowledge.filesSelected") || "files selected"}`
              ) : t("knowledge.selectFile"))}
            </p>
            <input
              type="file"
              id="file-upload"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept=".txt,.pdf,.docx"
              multiple
            />
            <label htmlFor="file-upload" className="btn btn-secondary" style={{ pointerEvents: 'none' }}>
              {t("knowledge.browse")}
            </label>
          </div>

          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? t("knowledge.uploading") : t("knowledge.uploadBtn")}
          </button>
        </div>

        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Database color="#22c55e" />
            <h2 style={{ margin: 0, color: 'var(--foreground)' }}>{t("knowledge.ragTitle") || "RAG Indexing"}</h2>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            {t("knowledge.ragDesc")}
          </p>

          <button
            className="btn"
            style={{ width: '100%', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={handleIndex}
            disabled={indexing}
          >
            <RefreshCw
              size={18}
              style={indexing ? { animation: 'spin 2s linear infinite' } : {}}
            />
            {indexing ? t("knowledge.indexing") : t("knowledge.indexBtn")}
          </button>

          {status && (
            <div style={{
              marginTop: '20px',
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--accent)',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} /> {status}
            </div>
          )}
        </div>
      </div>

      <div className="card glass" style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '20px', color: 'var(--foreground)' }}>{t("knowledge.existing")}</h2>
        {sources.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>{t("knowledge.emptySources")}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sources.map(source => (
              <div key={source.id} style={{
                background: 'var(--nav-hover)',
                border: '1px solid var(--card-border)',
                padding: '16px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileText color="var(--text-muted)" size={20} />
                  <span style={{ color: 'var(--foreground)', fontSize: '15px' }}>{source.name}</span>
                </div>
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  title="Delete Source"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
