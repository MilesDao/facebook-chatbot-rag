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
    const isDark = theme === "dark";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <button
          onClick={toggleTheme}
          style={{
            width: "100%",
            background: "var(--nav-hover)",
            border: "1px solid var(--card-border)",
            borderRadius: "8px",
            cursor: "pointer",
            textAlign: "left",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            color: "var(--foreground)",
            transition: "all 0.2s"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {isDark ? <Moon size={14} color="var(--accent)" /> : <Sun size={14} color="#f59e0b" />}
            <span>{isDark ? "Dark Mode" : "Light Mode"}</span>
          </div>
          <div style={{
            width: '32px',
            height: '18px',
            borderRadius: '10px',
            background: isDark ? 'var(--accent)' : '#ccc',
            position: 'relative',
            transition: 'background 0.2s'
          }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '2px',
              left: isDark ? '16px' : '2px',
              transition: 'left 0.2s'
            }} />
          </div>
        </button>
        {!isDark && (
          <div style={{ display: "flex", gap: "8px", padding: "0 4px", justifyContent: 'center' }}>
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
