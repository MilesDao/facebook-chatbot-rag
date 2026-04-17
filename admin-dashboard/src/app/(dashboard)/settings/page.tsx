"use client";

import { useState, useEffect } from "react";
import {
    Settings,
    Globe,
    ShieldCheck,
    Key,
    Cpu,
    Server,
    Save,
    Loader2,
    CheckCircle,
    AlertCircle,
    Info,
    LogOut,
    Eye,
    EyeOff
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { signOut, apiFetch } from "@/lib/auth";
import { useLanguage } from "@/components/LanguageContext";
import { ThemeToggle } from "@/components/ThemeToggle";

interface BotSettings {
    page_access_token: string;
    openrouter_api_key: string;
    page_id: string;
    verify_token: string;
    llm_model: string;
    app_secret: string;
}

interface ValidationErrors {
    page_id?: string;
    page_access_token?: string;
    openrouter_api_key?: string;
    verify_token?: string;
    app_secret?: string;
}

export default function SettingsPage() {
    const { t } = useLanguage();
    const [settings, setSettings] = useState<BotSettings>({
        page_access_token: "",
        openrouter_api_key: "",
        page_id: "",
        verify_token: "tuyensinh2026",
        llm_model: "openai/gpt-oss-120b:free",
        app_secret: ""
    });
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showTokens, setShowTokens] = useState({
        page_access_token: false,
        openrouter_api_key: false,
        app_secret: false
    });

    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await apiFetch("/api/settings");

            if (response.ok) {
                const data = await response.json();
                setSettings({
                    page_access_token: data.page_access_token || "",
                    openrouter_api_key: data.openrouter_api_key || "",
                    page_id: data.page_id || "",
                    verify_token: data.verify_token || "tuyensinh2026",
                    llm_model: data.llm_model || "openai/gpt-oss-120b:free",
                    app_secret: data.app_secret || ""
                });
            }
        } catch (err) {
            console.error("Failed to fetch settings:", err);
        } finally {
            setLoading(false);
        }
    };

    const validate = (): boolean => {
        const newErrors: ValidationErrors = {};

        if (!settings.page_id) {
            newErrors.page_id = "Page ID is required";
        } else if (!/^\d+$/.test(settings.page_id)) {
            newErrors.page_id = "Page ID must contain only numbers";
        } else if (settings.page_id.length < 10) {
            newErrors.page_id = "Page ID is too short (min 10 digits)";
        }

        if (!settings.page_access_token || settings.page_access_token.length < 20) {
            newErrors.page_access_token = "Valid Page Access Token is required";
        }

        if (!settings.openrouter_api_key || settings.openrouter_api_key.length < 15) {
            newErrors.openrouter_api_key = "OpenRouter API Key is required";
        }

        if (!settings.verify_token || settings.verify_token.length < 5) {
            newErrors.verify_token = "Verify Token must be at least 5 chars";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            setMessage({ type: 'error', text: 'Please fix the errors before saving.' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            const response = await apiFetch("/api/settings", {
                method: 'POST',
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully to Supabase!' });
            } else {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to save settings');
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const isFormValid = settings.page_id.length >= 10 &&
        settings.page_access_token.length >= 20 &&
        settings.openrouter_api_key.length >= 15;

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} noValidate>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '32px', color: 'var(--foreground)' }}>{t("settings.title")}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{t("settings.desc")}</p>
                </div>
                <button
                    type="submit"
                    className={`btn ${!isFormValid ? 'btn-secondary' : 'btn-primary'}`}
                    disabled={saving || !isFormValid}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: !isFormValid ? 0.5 : 1,
                        cursor: !isFormValid ? 'not-allowed' : 'pointer'
                    }}
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {saving ? t("settings.saving") || "Saving..." : t("settings.saveBtn") || "Save Changes"}
                </button>
            </header>

            {message && (
                <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: message.type === 'success' ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                {/* Facebook Integration */}
                <div className="card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Globe color="var(--accent)" />
                        <h2 style={{ margin: 0 }}>{t("settings.publicSettings")}</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                                Page ID (Numeric only)
                            </label>
                            <input
                                type="text"
                                className={`glass-input ${errors.page_id ? 'border-error' : ''}`}
                                value={settings.page_id}
                                onChange={e => {
                                    setSettings({ ...settings, page_id: e.target.value });
                                    if (errors.page_id) setErrors({ ...errors, page_id: undefined });
                                }}
                                placeholder="e.g. 104857293847562"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: 'var(--nav-hover)',
                                    border: `1px solid ${errors.page_id ? '#ef4444' : 'var(--card-border)'}`,
                                    color: 'var(--foreground)'
                                }}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Find this in Meta Business Suite &gt; Settings &gt; Page Info
                            </p>
                            {errors.page_id && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.page_id}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>App Secret (32 chars)</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showTokens.app_secret ? "text" : "password"}
                                    className="glass-input"
                                    value={settings.app_secret}
                                    onChange={e => {
                                        setSettings({ ...settings, app_secret: e.target.value });
                                        if (errors.app_secret) setErrors({ ...errors, app_secret: undefined });
                                    }}
                                    placeholder="e.g. 69fd9157f93df66386aa1805fd24b1e8"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        paddingRight: '44px',
                                        borderRadius: '8px',
                                        background: 'var(--nav-hover)',
                                        border: `1px solid ${errors.app_secret ? '#ef4444' : 'var(--card-border)'}`,
                                        color: 'var(--foreground)'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowTokens({ ...showTokens, app_secret: !showTokens.app_secret })}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '4px'
                                    }}
                                >
                                    {showTokens.app_secret ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Find this in App Dashboard &gt; Settings &gt; Basic
                            </p>
                            {errors.app_secret && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.app_secret}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Page Access Token</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showTokens.page_access_token ? "text" : "password"}
                                    className="glass-input"
                                    value={settings.page_access_token}
                                    onChange={e => {
                                        setSettings({ ...settings, page_access_token: e.target.value });
                                        if (errors.page_access_token) setErrors({ ...errors, page_access_token: undefined });
                                    }}
                                    placeholder="EAAWl..."
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        paddingRight: '44px',
                                        borderRadius: '8px',
                                        background: 'var(--nav-hover)',
                                        border: `1px solid ${errors.page_access_token ? '#ef4444' : 'var(--card-border)'}`,
                                        color: 'var(--foreground)'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowTokens({ ...showTokens, page_access_token: !showTokens.page_access_token })}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '4px'
                                    }}
                                >
                                    {showTokens.page_access_token ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.page_access_token && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.page_access_token}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Verify Token</label>
                            <input
                                type="text"
                                className="glass-input"
                                value={settings.verify_token}
                                onChange={e => {
                                    setSettings({ ...settings, verify_token: e.target.value });
                                    if (errors.verify_token) setErrors({ ...errors, verify_token: undefined });
                                }}
                                placeholder="my_secret_verify_token"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: 'var(--nav-hover)',
                                    border: `1px solid ${errors.verify_token ? '#ef4444' : 'var(--card-border)'}`,
                                    color: 'var(--foreground)'
                                }}
                            />
                            {errors.verify_token && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.verify_token}</p>}
                        </div>
                    </div>
                </div>

                {/* AI Configuration */}
                <div className="card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Cpu color="#a855f7" />
                        <h2 style={{ margin: 0 }}>{t("settings.aiIntegration")}</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Your bot uses OpenRouter (e.g., DeepSeek, Gemini, GPT) for reasoning and retrieval.
                        </p>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>OpenRouter API Key</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showTokens.openrouter_api_key ? "text" : "password"}
                                    className="glass-input"
                                    value={settings.openrouter_api_key}
                                    onChange={e => {
                                        setSettings({ ...settings, openrouter_api_key: e.target.value });
                                        if (errors.openrouter_api_key) setErrors({ ...errors, openrouter_api_key: undefined });
                                    }}
                                    placeholder="sk-or-v1-..."
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        paddingRight: '44px',
                                        borderRadius: '8px',
                                        background: 'var(--nav-hover)',
                                        border: `1px solid ${errors.openrouter_api_key ? '#ef4444' : 'var(--card-border)'}`,
                                        color: 'var(--foreground)'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowTokens({ ...showTokens, openrouter_api_key: !showTokens.openrouter_api_key })}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '4px'
                                    }}
                                >
                                    {showTokens.openrouter_api_key ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.openrouter_api_key && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.openrouter_api_key}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                                LLM Model (OpenRouter)
                            </label>
                            <select
                                className="glass-input"
                                value={settings.llm_model}
                                onChange={e => setSettings({ ...settings, llm_model: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: 'var(--nav-hover)',
                                    border: '1px solid var(--card-border)',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    appearance: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="deepseek/deepseek-chat">DeepSeek Chat (Default)</option>
                                <option value="nvidia/nemotron-4-340b-instruct:free">Nvidia Nemotron 4 (Free)</option>
                                <option value="google/gemma-2-9b-it:free">Google Gemma 2 9B (Free)</option>
                                <option value="meta-llama/llama-3.1-8b-instruct:free">Meta Llama 3.1 8B (Free)</option>
                                <option value="mistralai/pixtral-12b:free">Mistral Pixtral 12B (Free)</option>
                                <option value="qwen/qwen-2-7b-instruct:free">Qwen 2 7B (Free)</option>
                                <option value="nvidia/nemotron-3-super-120b-a12b:free">Nvidia Nemotron 3 Super (Free)</option>
                                <option value="openai/gpt-oss-120b:free">OpenAI GPT OSS (Free)</option>
                            </select>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                Models ending in <b>:free</b> are usually subject to lower rate limits.
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '13px' }}>
                            <ShieldCheck size={18} />
                            Supabase Vector DB Connected
                        </div>
                    </div>
                </div>

                {/* Deployment Info */}
                <div className="card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Server color="var(--accent)" />
                        <h2 style={{ margin: 0 }}>{t("settings.deployment")}</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
                            <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Webhook Endpoint</p>
                            <code style={{ fontSize: '12px', color: '#3b82f6' }}>{backendUrl}/webhook</code>
                        </div>

                        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
                            <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Environment</p>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--foreground)' }}>{process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}</p>
                        </div>

                        <div style={{
                            padding: '12px',
                            borderRadius: '12px',
                            background: 'rgba(59, 130, 246, 0.05)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            gap: '10px'
                        }}>
                            <Info size={16} style={{ flexShrink: 0, color: '#3b82f6' }} />
                            <span>
                                Ensure you have added the <b>Service Role Key</b> to your .env file to enable persistence.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Account / Sign Out */}
                <div className="card glass" style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <LogOut color="#ef4444" />
                        <h2 style={{ margin: 0 }}>{t("settings.account") || "Account"}</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Sign out of your account. You will need to log back in to access the dashboard.
                        </p>

                        <button
                            type="button"
                            onClick={() => {
                                if (confirm("Are you sure you want to sign out?")) {
                                    signOut();
                                }
                            }}
                            className="btn btn-secondary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#ef4444',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                                width: 'fit-content'
                            }}
                        >
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
