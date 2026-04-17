import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Bot Admin",
  description: "Management dashboard for Facebook AI RAG Bot",
};

/**
 * Root layout — only wraps html/body.
 * Sidebar is in (dashboard)/layout.tsx so it ONLY appears on dashboard pages.
 * Auth pages (login, register) use (auth)/layout.tsx which has no sidebar.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
