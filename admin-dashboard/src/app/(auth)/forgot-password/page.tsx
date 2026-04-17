"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Mail, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
        });

        if (resetError) {
            setError(resetError.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "13px 14px 13px 44px",
        borderRadius: "10px",
        fontSize: "15px",
        color: "white",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        outline: "none",
        transition: "border-color 0.2s ease",
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
            }}
        >
            <div style={{ width: "100%", maxWidth: "420px" }}>
                {/* Branding */}
                <div style={{ textAlign: "center", marginBottom: "40px" }}>
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 24px",
                            borderRadius: "16px",
                            background: "rgba(59, 130, 246, 0.12)",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            marginBottom: "20px",
                        }}
                    >
                        <BarChart3 color="#3b82f6" size={26} />
                        <span
                            style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                letterSpacing: "-0.03em",
                            }}
                        >
                            AI Admin
                        </span>
                    </div>
                </div>

                <div className="glass" style={{ padding: "40px" }}>
                    {success ? (
                        <div style={{ textAlign: "center" }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(34, 197, 94, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <CheckCircle2 color="#22c55e" size={32} />
                            </div>
                            <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "12px" }}>Check your email</h1>
                            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: "1.6", marginBottom: "32px" }}>
                                We've sent a password reset link to <strong>{email}</strong>.
                            </p>
                            <Link href="/login" className="btn" style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                                Return to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <Link href="/login" style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                color: 'rgba(255,255,255,0.4)',
                                textDecoration: 'none',
                                marginBottom: '24px'
                            }}>
                                <ArrowLeft size={14} /> Back to Login
                            </Link>

                            <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Forgot password?</h1>
                            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginBottom: "32px" }}>
                                No worries, we'll send you reset instructions.
                            </p>

                            {error && (
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "12px 16px",
                                    borderRadius: "10px",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.25)",
                                    color: "#ef4444",
                                    fontSize: "14px",
                                    marginBottom: "24px",
                                }}>
                                    <AlertCircle size={15} />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleResetRequest} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Email
                                    </label>
                                    <div style={{ position: "relative" }}>
                                        <Mail size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            required
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className="btn" style={{ width: '100%', padding: '14px', fontWeight: '600' }}>
                                    {loading ? <Loader2 className="animate-spin" size={20} style={{ margin: '0 auto' }} /> : "Reset Password"}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>

            <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
        </div>
    );
}
