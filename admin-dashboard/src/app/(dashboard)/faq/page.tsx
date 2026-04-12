"use client";

import { useEffect, useState } from "react";
import { HelpCircle, Plus, Trash2 } from "lucide-react";

export default function FAQSetup() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchFaqs = async () => {
    try {
      const res = await fetch("/api/faq");
      if (res.ok) {
        const data = await res.json();
        setFaqs(data);
      }
    } catch (err) {
      console.error("Failed to fetch FAQs:", err);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword || !answer) return;
    setLoading(true);
    
    try {
      const res = await fetch("/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, question, answer })
      });
      
      if (res.ok) {
        setKeyword("");
        setQuestion("");
        setAnswer("");
        await fetchFaqs();
      }
    } catch (err) {
      console.error("Failed to add FAQ:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (faqId: number) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    
    try {
      const res = await fetch(`/api/faq/${faqId}`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        await fetchFaqs();
      }
    } catch (err) {
      console.error("Failed to delete FAQ:", err);
    }
  };

  return (
    <>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <HelpCircle size={32} /> FAQ Setup
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Manage custom keyword-based answers for immediate priority.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <div className="card glass" style={{ height: 'fit-content' }}>
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} /> Add New FAQ
          </h2>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={handleAddFaq}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Keyword(s) *</label>
              <input 
                type="text" 
                placeholder="e.g. pricing" 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Optional Question</label>
              <input 
                type="text" 
                placeholder="e.g. What is the pricing?" 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Answer *</label>
              <textarea 
                placeholder="Our pricing starts at..." 
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                padding: '12px', 
                background: loading ? '#64748b' : '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? "Adding..." : "Add FAQ Entry"}
            </button>
          </form>
        </div>

        <div className="card glass">
          <h2 style={{ marginBottom: '20px' }}>Existing FAQs</h2>
          {faqs.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: '40px' }}>No FAQs added yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {faqs.map((faq) => (
                <div key={faq.id} style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  padding: '16px', 
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ paddingRight: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ background: '#3b82f633', color: '#60a5fa', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        {faq.keyword}
                      </span>
                      {faq.question && <span style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>{faq.question}</span>}
                    </div>
                    <p style={{ color: '#e2e8f0', fontSize: '15px', lineHeight: '1.5' }}>{faq.answer}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(faq.id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    title="Delete FAQ"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
