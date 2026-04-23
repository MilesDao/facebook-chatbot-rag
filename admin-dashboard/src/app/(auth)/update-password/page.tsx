"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Lock, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const router = useRouter();
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        async function checkSession() {
            const supabase = createClient();
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                setError("Your reset session has expired or is invalid. Please request a new password reset link.");
            }
            setCheckingSession(false);
        }
        checkSession();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        const supabase = createClient();
        const { error: authError } = await supabase.auth.updateUser({ password });

        if (authError) {
            setError(authError.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
            setTimeout(() => router.push("/login"), 3000);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "13px 14px 13px 44px",
        borderRadius: "10px",
        fontSize: "15px",
        color: "var(--foreground)",
        background: "var(--nav-hover)",
        border: "1px solid var(--card-border)",
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
                    {checkingSession ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 16px', color: 'var(--accent)' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Verifying your reset session...</p>
                        </div>
                    ) : success ? (
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
                            <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "12px" }}>Password updated</h1>
                            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>
                                Your password has been reset successfully. Redirecting you to login...
                            </p>
                        </div>
                    ) : (
                        <>
                            <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Set new password</h1>
                            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "32px" }}>
                                Your new password must be different from previous ones.
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

                            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        New Password
                                    </label>
                                    <div style={{ position: "relative" }}>
                                        <Lock size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min. 6 characters"
                                            required
                                            style={{ ...inputStyle, paddingRight: "44px" }}
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Confirm Password
                                    </label>
                                    <div style={{ position: "relative" }}>
                                        <Lock size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            placeholder="Repeat password"
                                            required
                                            style={{ ...inputStyle, paddingRight: "44px" }}
                                        />
                                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className="btn" style={{ width: '100%', padding: '14px', fontWeight: '600' }}>
                                    {loading ? <Loader2 className="animate-spin" size={20} style={{ margin: '0 auto' }} /> : "Update Password"}
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
