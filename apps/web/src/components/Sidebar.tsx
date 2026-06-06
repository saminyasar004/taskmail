"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  LogOut,
  Mail,
  RefreshCw,
  Zap,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [syncStatus, setSyncStatus] = useState<{ isWatched: boolean; watchExpiry: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Fetch watch status
  const fetchSyncStatus = async () => {
    try {
      const res = await fetch("/api/gmail/status");
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch Gmail watch status:", error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchSyncStatus();
    }
  }, [session]);

  const handleStartWatch = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/gmail/watch", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSyncStatus({ isWatched: true, watchExpiry: data.watchExpiry });
      }
    } catch (error) {
      console.error("Failed to start Gmail watch:", error);
    } finally {
      setSyncing(false);
    }
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/tasks", label: "Tasks", icon: <CheckSquare size={18} /> },
    { href: "/briefing", label: "Daily Briefing", icon: <FileText size={18} /> },
  ];

  const userEmail = session?.user?.email || "";
  const userName = session?.user?.name || "User";
  const userImage = session?.user?.image || "";

  return (
    <aside
      style={{
        width: 260,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand Logo */}
      <div
        style={{
          padding: "24px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Mail size={22} color="var(--accent-blue)" />
        <span
          className="font-display"
          style={{ fontSize: 20, fontWeight: 700, color: "var(--fg-primary)", letterSpacing: "-0.02em" }}
        >
          Taskmail
        </span>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--fg-primary)" : "var(--fg-secondary)",
                background: isActive ? "var(--bg-hover)" : "transparent",
                border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                transition: "all 0.15s ease",
                textDecoration: "none",
              }}
              className="nav-link"
            >
              <span style={{ color: isActive ? "var(--accent-blue)" : "inherit" }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Gmail Sync Status */}
      <div
        className="glass"
        style={{
          margin: "16px",
          padding: "16px",
          borderRadius: 14,
          fontSize: 13,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={14} color={syncStatus?.isWatched ? "var(--accent-green)" : "var(--fg-secondary)"} />
          <span style={{ fontWeight: 600, color: "var(--fg-primary)" }}>Gmail Auto-Sync</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.5, margin: 0 }}>
          {syncStatus?.isWatched
            ? "Connected. Emails are processed automatically in the background."
            : "Connect background watch to receive updates in real-time."}
        </p>
        {!syncStatus?.isWatched && (
          <button
            onClick={handleStartWatch}
            disabled={syncing}
            style={{
              width: "100%",
              padding: "8px",
              background: "linear-gradient(135deg, var(--accent-blue), var(--accent-violet))",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <RefreshCw size={12} className={syncing ? "spin" : ""} />
            {syncing ? "Connecting..." : "Enable Auto-Sync"}
          </button>
        )}
      </div>

      {/* User Info / Sign Out */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)" }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--accent-violet)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--fg-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {userName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--fg-secondary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {userEmail}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--fg-secondary)",
            cursor: "pointer",
            padding: 8,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.color = "#ef4444";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--fg-secondary)";
          }}
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
