import Link from "next/link";
import {
  BarChart3,
  Database,
  Inbox,
  Settings,
  HelpCircle,
} from "lucide-react";

/**
 * Dashboard layout — wraps all authenticated pages with the sidebar.
 * Only applied to routes inside the (dashboard) route group.
 * Auth pages (login/register) use (auth)/layout.tsx instead.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <aside className="sidebar glass">
        <div style={{ padding: "0 16px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <BarChart3 color="#3b82f6" /> AI Admin
          </h2>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Link href="/" className="nav-item">
            <BarChart3 size={20} /> Overview
          </Link>
          <Link href="/knowledge" className="nav-item">
            <Database size={20} /> Knowledge
          </Link>
          <Link href="/faq" className="nav-item">
            <HelpCircle size={20} /> FAQ Setup
          </Link>
          <Link href="/handoffs" className="nav-item">
            <Inbox size={20} /> Handoff Inbox
          </Link>
        </nav>

        <div style={{ marginTop: "auto" }}>
          <Link href="/settings" className="nav-item">
            <Settings size={20} /> Settings
          </Link>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </>
  );
}
