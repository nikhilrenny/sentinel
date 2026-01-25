// src/components/layout/TopNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const tabs = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/fleet", label: "Fleet" },
  { href: "/analytics", label: "Analytics" },
  { href: "/alerts", label: "Alerts" },
  { href: "/settings", label: "Settings" },
];

type ThemeMode = "system" | "light" | "dark";
const THEME_KEY = "sentinel_theme_mode";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const effective = mode === "system" ? getSystemTheme() : mode;

  root.setAttribute("data-theme", effective);
  root.setAttribute("data-theme-mode", mode); // optional debug hook
}

function AvatarButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open profile menu"
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      NT
    </button>
  );
}

function MenuButton({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        border: "none",
        background: "#fff",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => ((e.currentTarget.style.background = "#f9fafb"))}
      onMouseLeave={(e) => ((e.currentTarget.style.background = "#fff"))}
    >
      <div style={{ fontWeight: 800, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{hint}</div>
    </button>
  );
}

function ThemeToggleRow({
  mode,
  onToggle,
}: {
  mode: ThemeMode;
  onToggle: () => void;
}) {
  const effective: "light" | "dark" = mode === "system" ? getSystemTheme() : mode;

  return (
    <div style={{ padding: "8px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 13 }}>Theme</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            {mode === "system" ? `System (${effective})` : effective === "dark" ? "Dark" : "Light"}
          </div>
        </div>

        {/* Smaller toggle — adjust size here */}
        <button
          type="button"
          onClick={onToggle}
          aria-label="Toggle theme"
          style={{
            width: 44,
            height: 24,
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: effective === "dark" ? "#111827" : "#f3f4f6",
            padding: 2,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: effective === "dark" ? "flex-end" : "flex-start",
          }}
        >
          <div style={{ width: 20, height: 20, borderRadius: 999, background: "#fff" }} />
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
        Toggle switches Light/Dark. System is used only until you toggle.
      </div>
    </div>
  );
}

export default function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // C: last saved; else system (no setState inside effects)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    } catch {
      return "system";
    }
  });

  const themeModeRef = useRef<ThemeMode>(themeMode);

  // Keep ref in sync
  useEffect(() => {
    themeModeRef.current = themeMode;
  }, [themeMode]);

  // Persist + apply whenever themeMode changes
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, themeMode);
    } catch {
      // ignore
    }
    applyTheme(themeMode);
  }, [themeMode]);

  // React to OS theme changes if mode is "system" (no setState)
  useEffect(() => {
    // Ensure applied once on mount as well
    applyTheme(themeModeRef.current);

    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = () => {
      if (themeModeRef.current === "system") applyTheme("system");
    };

    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  function toggleTheme() {
    setThemeMode((prev) => {
      const eff = prev === "system" ? getSystemTheme() : prev;
      return eff === "dark" ? "light" : "dark";
    });
  }

  // Close menu on outside click / escape
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px" }}>
        <div style={{ fontWeight: 900, letterSpacing: -0.2 }}>Sentinel</div>

        <nav style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                style={{
                  textDecoration: "none",
                  color: "#111827",
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: active ? "#f3f4f6" : "transparent",
                  border: active ? "1px solid #e5e7eb" : "1px solid transparent",
                  fontWeight: active ? 800 : 600,
                  fontSize: 13,
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        <input
          placeholder="Search (coming soon)"
          disabled
          style={{
            width: 420,
            maxWidth: "40vw",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            fontSize: 14,
          }}
        />

        {/* Profile dropdown */}
        <div style={{ position: "relative" }} ref={menuRef}>
          <AvatarButton onClick={() => setOpen((v) => !v)} />

          {open && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 44,
                width: 260,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#fff",
                boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 13 }}>Nikhil Renny</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Profile menu (placeholder)
                </div>
              </div>

              <div style={{ height: 1, background: "#f3f4f6" }} />

              <MenuButton label="Account" hint="Placeholder" onClick={() => setOpen(false)} />
              <MenuButton label="Preferences" hint="Placeholder" onClick={() => setOpen(false)} />

              <div style={{ height: 1, background: "#f3f4f6" }} />

              {/* Theme above About, single toggle */}
              <ThemeToggleRow mode={themeMode} onToggle={toggleTheme} />

              <div style={{ height: 1, background: "#f3f4f6" }} />

              <MenuButton label="About" hint="Version & build (placeholder)" onClick={() => setOpen(false)} />

              <div style={{ height: 1, background: "#f3f4f6" }} />

              <MenuButton label="Sign out" hint="Placeholder" onClick={() => setOpen(false)} />
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: "#f3f4f6" }} />
    </header>
  );
}
