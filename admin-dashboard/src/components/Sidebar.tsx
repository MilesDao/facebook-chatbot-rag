"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "./LanguageContext";
import { BarChart3, Database, Inbox, MessageSquare, Settings, HelpCircle } from "lucide-react";

export function Sidebar() {
  const { t } = useLanguage();

  return (
    <aside className="sidebar glass">
      <div style={{ padding: '0 16px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChart3 color="var(--accent)" /> AI Admin
        </h2>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link href="/" className="nav-item">
          <BarChart3 size={20} /> {t("nav.overview")}
        </Link>
        <Link href="/knowledge" className="nav-item">
          <Database size={20} /> {t("nav.knowledge")}
        </Link>
        <Link href="/faq" className="nav-item">
          <HelpCircle size={20} /> {t("nav.faq")}
        </Link>
        <Link href="/handoffs" className="nav-item">
          <Inbox size={20} /> {t("nav.handoffs")}
        </Link>
      </nav>
      
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <LanguageToggle />
        <ThemeToggle variant="nav-item" />
        <Link href="/settings" className="nav-item">
          <Settings size={20} /> {t("nav.settings")}
        </Link>
      </div>
    </aside>
  );
}
