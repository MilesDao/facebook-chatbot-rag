"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Mail, Lock, UserPlus, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
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
    const { error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
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
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            Multi-tenant Facebook RAG Platform
          </p>
        </div>

        <div className="glass" style={{ padding: "40px" }}>
          {success ? (
            /* Success State */
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <CheckCircle2
                size={52}
                color="#22c55e"
                style={{ marginBottom: "20px" }}
              />
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  marginBottom: "12px",
                }}
              >
                Account Created!
              </h2>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  marginBottom: "28px",
                }}
              >
                Check your email for a confirmation link, then come back to sign
                in. Your dashboard will be ready and waiting.
              </p>
              <Link
                href="/login"
                className="btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 28px",
                  textDecoration: "none",
                }}
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  marginBottom: "6px",
                  letterSpacing: "-0.03em",
                }}
              >
                Create an account
              </h1>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "14px",
                  marginBottom: "32px",
                }}
              >
                Set up your own isolated bot workspace.
              </p>

              {error && (
                <div
                  style={{
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
                  }}
                >
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <form
                onSubmit={handleRegister}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Email
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail
                      size={15}
                      style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      style={inputStyle}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "rgba(59, 130, 246, 0.6)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--card-border)")
                      }
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock
                      size={15}
                      style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      style={{ ...inputStyle, paddingRight: "44px" }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "rgba(59, 130, 246, 0.6)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--card-border)")
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        padding: "4px",
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Confirm Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock
                      size={15}
                      style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Same password again"
                      required
                      style={{ ...inputStyle, paddingRight: "44px" }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "rgba(59, 130, 246, 0.6)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--card-border)")
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        padding: "4px",
                      }}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn"
                  style={{
                    width: "100%",
                    padding: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    fontSize: "15px",
                    fontWeight: "600",
                    marginTop: "4px",
                    opacity: loading ? 0.75 : 1,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: "18px",
                        height: "18px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                  ) : (
                    <UserPlus size={18} />
                  )}
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </form>

              <p
                style={{
                  textAlign: "center",
                  marginTop: "28px",
                  fontSize: "14px",
                  color: "var(--text-muted)",
                }}
              >
                Already have an account?{" "}
                <Link
                  href="/login"
                  style={{
                    color: "#3b82f6",
                    textDecoration: "none",
                    fontWeight: "500",
                  }}
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        input::placeholder {
          color: var(--text-muted);
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
