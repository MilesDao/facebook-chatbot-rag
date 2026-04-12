"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      title="Sign Out"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "12px",
        textDecoration: "none",
        color: "rgba(255, 255, 255, 0.5)",
        transition: "all 0.2s ease",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        width: "100%",
        fontSize: "inherit",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(239, 68, 68, 0.1)";
        (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color =
          "rgba(255, 255, 255, 0.5)";
      }}
    >
      <LogOut size={20} /> Sign Out
    </button>
  );
}
