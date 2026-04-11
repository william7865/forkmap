"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, getSupabaseBrowserClient } from "@/lib/hooks/useAuth";
import { useState, useRef, useEffect } from "react";

const NAV = [
  { href: "/",           icon: "🗺", label: "Carte"   },
  { href: "/favorites",  icon: "♡", label: "Favoris"  },
  { href: "/account",    icon: "◎", label: "Compte"   },
];

const SECONDARY = [
  { href: "/help",     label: "Aide"       },
  { href: "/about",    label: "À propos"   },
  { href: "/contact",  label: "Contact"    },
];

export default function NavRail() {
  const pathname  = usePathname();
  const auth      = useAuth();
  const [popover, setPopover] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const sb        = getSupabaseBrowserClient();

  useEffect(() => {
    if (!popover) return;
    const handler = (e: MouseEvent) => {
      if (!avatarRef.current?.contains(e.target as Node)) setPopover(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popover]);

  const initials = auth.user?.user_metadata?.full_name
    ?.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    ?? auth.user?.email?.[0].toUpperCase()
    ?? "?";

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, bottom: 0,
      width: 52, background: "var(--white)",
      borderRight: "1px solid var(--ink-10)",
      display: "flex", flexDirection: "column",
      alignItems: "center", padding: "12px 0",
      zIndex: 200,
    }}>
      {/* Logo mark */}
      <Link href="/" style={{ marginBottom: 16, textDecoration: "none" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "var(--forest-mid)", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 4v8c0 2.5 1 4 3 4.5V21M15 4v5c0 1-.7 1.5-1.5 1.5S12 10 12 9V4M15 9.5c0 2 1.5 3 3 3V21"
              stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </Link>

      {/* Primary nav items */}
      {NAV.map(item => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} title={item.label} style={{ textDecoration: "none", marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: active ? "var(--forest-pale)" : "transparent",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 1,
              transition: "background 120ms",
            }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
              {active && <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.04em", color: "var(--forest-mid)", fontFamily: "var(--font-body)" }}>{item.label}</span>}
            </div>
          </Link>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Settings item */}
      <Link href="/settings" title="Paramètres" style={{ textDecoration: "none", marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: pathname === "/settings" ? "var(--forest-pale)" : "transparent",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 1,
          transition: "background 120ms",
        }}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>⚙️</span>
          {pathname === "/settings" && (
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.04em", color: "var(--forest-mid)", fontFamily: "var(--font-body)" }}>Réglages</span>
          )}
        </div>
      </Link>

      {/* Avatar / popover */}
      <div ref={avatarRef} style={{ position: "relative" }}>
        <button onClick={() => setPopover(v => !v)} style={{
          width: 30, height: 30, borderRadius: "50%",
          background: auth.user ? "var(--forest-mid)" : "var(--ink-20)",
          border: "none", cursor: "pointer",
          color: "white", fontSize: 11, fontWeight: 700,
          fontFamily: "var(--font-body)",
        }}>
          {initials}
        </button>

        {popover && (
          <div style={{
            position: "absolute", bottom: 40, left: 8,
            background: "var(--white)", border: "1px solid var(--ink-10)",
            borderRadius: 12, boxShadow: "var(--s3)",
            padding: "6px 0", minWidth: 160, zIndex: 300,
          }}>
            {SECONDARY.map(s => (
              <Link key={s.href} href={s.href} onClick={() => setPopover(false)} style={{
                display: "block", padding: "7px 14px",
                fontSize: 13, color: "var(--ink-80)", textDecoration: "none",
                fontFamily: "var(--font-body)",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--off-white)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >{s.label}</Link>
            ))}
            {auth.user && (
              <>
                <button onClick={async () => { await sb.auth.signOut(); setPopover(false); }} style={{
                  display: "block", width: "100%", padding: "7px 14px", textAlign: "left",
                  fontSize: 13, color: "var(--coral)", background: "none", border: "none",
                  cursor: "pointer", fontFamily: "var(--font-body)",
                }}>Se déconnecter</button>
              </>
            )}
            {!auth.user && (
              <button onClick={() => setPopover(false)} style={{
                display: "block", width: "100%", padding: "7px 14px", textAlign: "left",
                fontSize: 13, color: "var(--forest-mid)", background: "none", border: "none",
                cursor: "pointer", fontFamily: "var(--font-body)",
              }}>Se connecter</button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
