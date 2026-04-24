"use client";

import { useLanguage } from "./LanguageContext";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLang = () => {
    setLanguage(language === "en" ? "vi" : "en");
  };

  return (
    <button
      onClick={toggleLang}
      className="nav-item"
      style={{
        background: "var(--accent-glow)",
        border: "1px solid var(--accent-alpha)",
        cursor: "pointer",
        textAlign: "center",
        fontSize: "11px",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 10px",
        borderRadius: "20px",
        color: "var(--accent)",
        fontWeight: 700,
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-alpha)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; }}
      title="Toggle Language"
    >
      {t("lang.toggle")}
    </button>
  );
}
