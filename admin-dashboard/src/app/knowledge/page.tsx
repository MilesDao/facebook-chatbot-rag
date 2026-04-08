"use client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

import { useState, useEffect } from "react";
import { 
  FileUp, 
  Database, 
  RefreshCw, 
  FileText,
  Search,
  CheckCircle2
} from "lucide-react";

export default function KnowledgeBase() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [docsCount, setDocsCount] = useState(0);

  useEffect(() => {
    // Initial fetch of docs count or similar if needed
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setStatus("File uploaded successfully! Ready to index.");
        setFile(null);
      } else {
        setStatus("Upload failed.");
      }
    } catch (err) {
      console.error(err);
      setStatus("Error connecting to backend.");
    } finally {
      setUploading(false);
    }
  };

  const handleIndex = async () => {
    setIndexing(true);
    setStatus("Indexing in progress...");

    try {
      const res = await fetch(`${BACKEND_URL}/api/index`, {
        method: "POST"
      });

      if (res.ok) {
        setStatus("Indexing started in background. Refresh in a moment.");
      } else {
        setStatus("Failed to start indexing.");
      }
    } catch (err) {
      console.error(err);
      setStatus("Error connecting to backend.");
    } finally {
      setIndexing(false);
    }
  };

  return (
    <>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px' }}>Knowledge Base</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Manage the training data and RAG retrieval sources.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <FileUp color="#3b82f6" />
            <h2 style={{ margin: 0 }}>Add Knowledge</h2>
          </div>
          
          <div style={{ 
            border: '2px dashed rgba(255,255,255,0.1)', 
            borderRadius: '12px', 
            padding: '40px', 
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <FileText size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: '16px' }} />
            <p style={{ marginBottom: '16px', fontSize: '14px' }}>{file ? file.name : "Select a .txt or .pdf file"}</p>
            <input 
              type="file" 
              id="file-upload" 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
              accept=".txt,.pdf"
            />
            <label htmlFor="file-upload" className="btn btn-secondary">
              Browse Files
            </label>
          </div>

          <button 
            className="btn" 
            style={{ width: '100%' }} 
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? "Uploading..." : "Upload to Backend"}
          </button>
        </div>

        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Database color="#22c55e" />
            <h2 style={{ margin: 0 }}>RAG Indexing</h2>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
            After uploading files, you must trigger the indexing process to update the Supabase vector database.
          </p>

          <button 
            className="btn" 
            style={{ width: '100%', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={handleIndex}
            disabled={indexing}
          >
            <RefreshCw size={18} className={indexing ? 'animate-spin' : ''} />
            {indexing ? "Indexing..." : "Trigger Re-indexing"}
          </button>

          {status && (
            <div style={{ 
              marginTop: '20px', 
              padding: '12px', 
              borderRadius: '8px', 
              background: 'rgba(59, 130, 246, 0.1)', 
              color: '#3b82f6',
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

      <style jsx>{`
        .animate-spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
