import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { 
  BarChart3, 
  Database, 
  Inbox, 
  MessageSquare, 
  Settings,
  HelpCircle
} from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Bot Admin",
  description: "Management dashboard for Facebook AI RAG Bot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <aside className="sidebar glass">
          <div style={{ padding: '0 16px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <BarChart3 color="#3b82f6" /> AI Admin
            </h2>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
          
          <div style={{ marginTop: 'auto' }}>
            <Link href="/settings" className="nav-item">
              <Settings size={20} /> Settings
            </Link>
          </div>
        </aside>
        
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
