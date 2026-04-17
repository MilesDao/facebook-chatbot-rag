"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  variant?: "icon" | "nav-item";
}

export function ThemeToggle({ variant = "icon" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleSubTheme = (newTheme: string) => {
    setTheme(newTheme);
  };

  const toggleTheme = () => {
    // If currently dark, switch to light (default). If currently in *any* light mode, switch to dark.
    const isDark = theme === "dark";
    setTheme(isDark ? "light" : "dark");
  };

  if (variant === "nav-item") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          onClick={toggleTheme}
          className="nav-item"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            fontSize: "14px",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 16px"
          }}
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="var(--accent)" />}
          <span style={{ fontWeight: 500, color: "var(--foreground)" }}>
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
        {theme !== "dark" && (
          <div style={{ display: "flex", gap: "10px", padding: "0 16px", marginBottom: "8px" }}>
            <button title="Default" onClick={() => handleSubTheme("light")} style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#f3f4f6", border: theme === "light" ? "2px solid var(--accent)" : "1px solid var(--card-border)", cursor: "pointer" }} />
            <button title="Pink" onClick={() => handleSubTheme("light-pink")} style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#fbcfe8", border: theme === "light-pink" ? "2px solid #db2777" : "1px solid var(--card-border)", cursor: "pointer" }} />
            <button title="Green" onClick={() => handleSubTheme("light-green")} style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#bbf7d0", border: theme === "light-green" ? "2px solid #16a34a" : "1px solid var(--card-border)", cursor: "pointer" }} />
            <button title="Blue" onClick={() => handleSubTheme("light-blue")} style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#bfdbfe", border: theme === "light-blue" ? "2px solid #2563eb" : "1px solid var(--card-border)", cursor: "pointer" }} />
            <button title="Purple" onClick={() => handleSubTheme("light-purple")} style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#e9d5ff", border: theme === "light-purple" ? "2px solid #9333ea" : "1px solid var(--card-border)", cursor: "pointer" }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="btn-secondary"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
        borderRadius: "12px",
        width: "40px",
        height: "40px",
        background: 'var(--nav-hover)',
        border: '1px solid var(--card-border)',
        cursor: 'pointer'
      }}
      title="Toggle Theme"
    >
      {theme === "dark" ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} color="var(--accent)" />}
    </button>
  );
}
