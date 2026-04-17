"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/auth";

export default function FAQSetup() {
  const { t } = useLanguage();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchFaqs = async () => {
    try {
      const res = await apiFetch("/api/faq");
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
      const res = await apiFetch("/api/faq", {
        method: "POST",
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
    if (!confirm(t("faq.deleteConfirm"))) return;
    
    try {
      const res = await apiFetch(`/api/faq/${faqId}`, {
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
          <HelpCircle size={32} /> {t("faq.title")}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>{t("faq.desc")}</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <div className="card glass" style={{ height: 'fit-content' }}>
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} /> {t("faq.addNew")}
          </h2>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={handleAddFaq}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>{t("faq.keyword")}</label>
              <input 
                type="text" 
                placeholder={t("faq.keywordPlaceholder")} 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--nav-hover)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>{t("faq.question")}</label>
              <input 
                type="text" 
                placeholder={t("faq.questionPlaceholder")} 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--nav-hover)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>{t("faq.answer")}</label>
              <textarea 
                placeholder={t("faq.answerPlaceholder")} 
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--nav-hover)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                padding: '12px', 
                background: loading ? 'var(--nav-hover)' : 'var(--accent)', 
                color: loading ? 'var(--foreground)' : '#ffffff', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? t("faq.adding") : t("faq.addBtn")}
            </button>
          </form>
        </div>

        <div className="card glass">
          <h2 style={{ marginBottom: '20px' }}>{t("faq.existing")}</h2>
          {faqs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>{t("faq.empty")}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {faqs.map((faq) => (
                <div key={faq.id} style={{ 
                  background: 'var(--nav-hover)', 
                  border: '1px solid var(--card-border)', 
                  padding: '16px', 
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ paddingRight: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        {faq.keyword}
                      </span>
                      {faq.question && <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>{faq.question}</span>}
                    </div>
                    <p style={{ color: 'var(--foreground)', fontSize: '15px', lineHeight: '1.5' }}>{faq.answer}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(faq.id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    title={t("faq.deleteTitle")}
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
