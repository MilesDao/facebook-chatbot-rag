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
  Trash2,
  Image,
  Copy,
  ExternalLink,
  Link,
  Clock,
  Plus,
  Eye,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { apiFetch } from "@/lib/auth";

export default function KnowledgeBase() {
  const { t } = useLanguage();
  const { currentWorkspace } = useWorkspace();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sources, setSources] = useState<{ id: string, name: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaStatus, setMediaStatus] = useState<string | null>(null);
  const [isMediaDragging, setIsMediaDragging] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [sourceContents, setSourceContents] = useState<{ [key: string]: string }>({});

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

  const fetchMedia = async () => {
    try {
      const res = await apiFetch("/api/media");
      if (res.ok) {
        setMediaFiles(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch media:", err);
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      fetchSources();
      fetchMedia();
    }
  }, [currentWorkspace?.id]);

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

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setMediaUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setMediaStatus(t("media.uploadSuccess") || "Upload success!");
        fetchMedia();
        setTimeout(() => setMediaStatus(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMediaUploading(false);
    }
  };

  const handleMediaDelete = async (filename: string) => {
    if (!confirm(t("media.confirmDelete"))) return;
    try {
      const res = await apiFetch(`/api/media/${filename}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchMedia();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMediaDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsMediaDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const mockEvent = { target: { files: [file] } } as any;
      handleMediaUpload(mockEvent);
    }
  };

  const handleViewSource = async (filename: string) => {
    if (expandedSource === filename) {
      setExpandedSource(null);
      return;
    }

    setExpandedSource(filename);

    if (sourceContents[filename]) return;

    try {
      const res = await apiFetch(`/api/sources/${filename}/content`);
      if (res.ok) {
        const text = await res.text();
        setSourceContents(prev => ({ ...prev, [filename]: text }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(t("media.copied"));
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
              <div key={source.id} className="glass" style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--card-border)'
              }}>
                <div
                  onClick={() => handleViewSource(source.id)}
                  style={{
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: expandedSource === source.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileText color={expandedSource === source.id ? 'var(--accent)' : 'var(--text-muted)'} size={20} />
                    <span style={{
                      color: expandedSource === source.id ? 'var(--accent)' : 'var(--foreground)',
                      fontSize: '15px',
                      fontWeight: expandedSource === source.id ? 'bold' : 'normal'
                    }}>{source.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {expandedSource === source.id ? <ChevronUp size={18} color="var(--accent)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSource(source.id);
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      title="Delete Source"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {expandedSource === source.id && (
                  <div style={{
                    padding: '16px',
                    borderTop: '1px solid var(--card-border)',
                    background: 'rgba(0,0,0,0.1)',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'var(--foreground)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {sourceContents[source.id] || t("knowledge.processing")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div
        className="card glass"
        style={{
          marginTop: '40px',
          border: isMediaDragging ? '2px solid var(--accent)' : '1px solid var(--card-border)',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
        onDragOver={(e) => { e.preventDefault(); setIsMediaDragging(true); }}
        onDragLeave={() => setIsMediaDragging(false)}
        onDrop={handleMediaDrop}
      >
        {isMediaDragging && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            color: 'var(--accent)',
            fontWeight: 'bold',
            gap: '12px'
          }}>
            <FileUp size={32} />
            {t("media.dragHere") || "Drop files here to upload"}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Image color="var(--accent)" />
            <h2 style={{ margin: 0, color: 'var(--foreground)' }}>{t("media.title")}</h2>
          </div>
          <button
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => document.getElementById('media-upload-input')?.click()}
            disabled={mediaUploading}
          >
            <Plus size={18} /> {mediaUploading ? "..." : t("media.upload")}
          </button>
          <input
            type="file"
            id="media-upload-input"
            style={{ display: 'none' }}
            onChange={handleMediaUpload}
            accept="image/*,application/pdf"
          />
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          {t("media.desc")}
        </p>

        {mediaFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(0,0,0,0.05)', borderRadius: '12px' }}>
            <p style={{ color: 'var(--text-muted)' }}>{t("media.empty")}</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {mediaFiles.map((file, i) => (
              <div key={i} className="glass" style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--card-border)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Preview area */}
                <div style={{
                  height: '160px',
                  background: 'rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px'
                }}>
                  {file.url && (file.url.match(/\.(jpg|jpeg|png|gif|webp)/i)) ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }}
                    />
                  ) : (
                    <FileText size={48} color="var(--text-muted)" />
                  )}
                </div>

                {/* Details area */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: 'var(--foreground)',
                    marginBottom: '4px',
                    wordBreak: 'break-all',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {file.name.replace(/^\d+_/, '')}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
                    <Clock size={12} /> {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'N/A'}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button
                      onClick={() => copyToClipboard(`[FILE:${file.url}]`)}
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    >
                      <Copy size={13} /> {t("media.copyUrl")}
                    </button>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <ExternalLink size={13} />
                    </a>
                    <button
                      onClick={() => handleMediaDelete(file.name)}
                      style={{
                        padding: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
