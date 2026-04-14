"use client";

import {
    Settings,
    Globe,
    ShieldCheck,
    Key,
    Cpu,
    Server,
    Palette
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/components/LanguageContext";

export default function SettingsPage() {
  const { t } = useLanguage();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    return (
        <>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '32px' }}>{t("settings.title")}</h1>
                <p style={{ color: 'var(--text-muted)' }}>{t("settings.desc")}</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>

                {/* Connection Settings */}
                <div className="card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Server color="var(--accent)" />
                        <h2 style={{ margin: 0 }}>{t("settings.deployment")}</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{
                            padding: '16px',
                            borderRadius: '12px',
                            background: 'var(--nav-hover)',
                            border: '1px solid var(--card-border)'
                        }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t("settings.backendUrl")}</p>
                            <code style={{ fontSize: '14px', color: 'var(--accent)' }}>{backendUrl}</code>
                        </div>

                        <div style={{
                            padding: '16px',
                            borderRadius: '12px',
                            background: 'var(--nav-hover)',
                            border: '1px solid var(--card-border)'
                        }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t("settings.frontendEnv")}</p>
                            <code style={{ fontSize: '14px', color: '#10b981' }}>{process.env.NODE_ENV === 'production' ? 'Vercel Production' : 'Local Development'}</code>
                        </div>
                    </div>
                </div>

                {/* AI Configuration */}
                <div className="card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Cpu color="#a855f7" />
                        <h2 style={{ margin: 0 }}>{t("settings.aiIntegration")}</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Your bot is powered by Google Gemini 1.5 Flash.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '14px' }}>
                            <ShieldCheck size={16} /> Gemini API Key Configured
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '14px' }}>
                            <ShieldCheck size={16} /> Supabase Vector DB Connected
                        </div>
                    </div>
                </div>

                {/* Access Control */}
                <div className="card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Globe color="#f59e0b" />
                        <h2 style={{ margin: 0 }}>{t("settings.publicSettings")}</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Configure how your bot interacts with the public Facebook Messenger API.
                        </p>
                        <button className="btn btn-secondary" style={{ width: '100%', cursor: 'not-allowed', opacity: 0.5 }}>
                            Update Webhook URL
                        </button>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.8 }}>
                            Visit Facebook Developer Portal to change Webhook settings.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
