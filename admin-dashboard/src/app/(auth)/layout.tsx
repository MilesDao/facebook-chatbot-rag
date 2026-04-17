"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * Auth layout — wraps login and register pages.
 * Forces dark mode for the authentication experience.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setTheme } = useTheme();

  useEffect(() => {
    // Force dark theme on mount for auth pages
    setTheme("dark");
  }, [setTheme]);

  return (
    <div
      data-theme="dark"
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        color: "var(--foreground)",
        backgroundImage: `
          radial-gradient(at 0% 0%, var(--bg-gradient-1) 0, transparent 50%),
          radial-gradient(at 100% 100%, var(--bg-gradient-2) 0, transparent 50%)
        `,
      }}
    >
      {children}
    </div>
  );
}
