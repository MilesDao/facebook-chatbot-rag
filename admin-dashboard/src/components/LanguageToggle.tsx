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
        width: "100%",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontSize: "16px",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px"
      }}
      title="Toggle Language"
    >
      <Globe size={20} color="var(--text-muted)" />
      <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
        {t("lang.toggle")}
      </span>
    </button>
  );
}
