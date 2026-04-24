import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Auth layout — wraps login and register pages.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        color: "var(--foreground)",
        backgroundImage: `
          radial-gradient(at 0% 0%, var(--bg-gradient-1) 0, transparent 50%),
          radial-gradient(at 100% 100%, var(--bg-gradient-2) 0, transparent 50%)
        `,
        position: 'relative'
      }}
    >
      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
