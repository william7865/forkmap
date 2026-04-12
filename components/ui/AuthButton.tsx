// ============================================================
// components/ui/AuthButton.tsx — Carte Blanche redesign
// ============================================================
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { AuthState } from "@/lib/hooks/useAuth";

interface Props {
  auth: AuthState;
  onOpenModal: () => void;
}

const IcoUser = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IcoLogOut = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IcoHeart = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IcoChevron = ({ open }: { open: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
    style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

interface PanelProps {
  anchorRef: React.RefObject<HTMLElement>;
  auth: AuthState;
  onClose: () => void;
}

function DropdownPanel({ anchorRef, auth, onClose }: PanelProps) {
  const [rect, setRect] = useState<{ top: number; right: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 6, right: window.innerWidth - r.right });
  }, [anchorRef]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !anchorRef.current?.contains(t)) onClose();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [anchorRef, onClose]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!rect) return null;

  const name     = auth.user?.user_metadata?.full_name ?? auth.user?.email?.split("@")[0] ?? "User";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const avatar   = auth.user?.user_metadata?.avatar_url;

  return createPortal(
    <div ref={panelRef} style={{
      position: "fixed",
      top: rect.top, right: rect.right,
      zIndex: 99999,
      background: "var(--white)",
      border: "1px solid var(--b1)",
      borderRadius: "var(--r-xl)",
      boxShadow: "0 16px 48px rgba(14,14,13,0.14), 0 2px 8px rgba(14,14,13,0.08)",
      minWidth: 228,
      overflow: "hidden",
      fontFamily: "var(--font-body)",
      animation: "fadeDown 180ms cubic-bezier(0.16,1,0.3,1) both",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px 12px",
        borderBottom: "1px solid var(--b1)",
        background: "var(--off-white)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
          background: "var(--forest-mid)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {avatar
            ? <Image src={avatar} alt={name} width={36} height={36} style={{ objectFit: "cover" }} />
            : <span style={{ fontSize: 13, fontWeight: 600, color: "white", letterSpacing: "-0.02em" }}>{initials}</span>
          }
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily:"var(--font-display)", fontSize: 15, fontWeight: 400, letterSpacing:"-0.03em", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
          <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--ink-40)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{auth.user?.email}</p>
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "5px 0" }}>
        {[
          { href: "/account",   label: "Mon compte",   icon: <IcoUser /> },
          { href: "/favorites", label: "Mes favoris",  icon: <span style={{ color: "var(--forest-mid)", display: "flex" }}><IcoHeart /></span> },
          { href: "/settings",  label: "Paramètres",     icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
        ].map(({ href, label, icon }) => (
          <a key={href} href={href} onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", textDecoration: "none", fontSize: 13, fontWeight: 500, color: "var(--ink-80)", transition: "background var(--t1) ease, color var(--t1) ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--off-white)"; e.currentTarget.style.color = "var(--forest-mid)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-80)"; }}
          >
            {icon}
            {label}
          </a>
        ))}

        <div style={{ height: 1, background: "var(--b1)", margin: "4px 12px" }}/>

        {[
          { href: "/help",    label: "Aide & FAQ" },
          { href: "/about",   label: "À propos" },
          { href: "/contact", label: "Contact" },
        ].map(({ href, label }) => (
          <a key={href} href={href} onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", textDecoration: "none", fontSize: 12, fontWeight: 400, color: "var(--ink-40)", transition: "background var(--t1) ease, color var(--t1) ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--off-white)"; e.currentTarget.style.color = "var(--ink-80)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-40)"; }}
          >
            {label}
          </a>
        ))}

        <div style={{ height: 1, background: "var(--b1)", margin: "4px 12px" }}/>

        <button
          onClick={() => { auth.signOut(); onClose(); }}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--coral)", textAlign: "left", transition: "background var(--t1) ease" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--coral-pale)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <IcoLogOut />
          Sign out
        </button>
      </div>
    </div>,
    document.body
  );
}

export default function AuthButton({ auth, onOpenModal }: Props) {
  const [open,    setOpen]    = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => setMounted(true), []);

  if (auth.loading) {
    return (
      <div style={{ width: 32, height: 32, borderRadius: "var(--r-md)", background: "var(--cream)", animation: "shimmer 1.6s ease-in-out infinite" }}/>
    );
  }

  if (!auth.user) {
    return (
      <button onClick={onOpenModal} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 14px",
        borderRadius: "var(--r-md)", cursor: "pointer",
        fontSize: 12, fontWeight: 600,
        fontFamily: "var(--font-body)",
        background: "var(--forest-mid)", color: "white",
        border: "none",
        boxShadow: "var(--s-forest)",
        transition: "background var(--t2) ease",
        flexShrink: 0,
        letterSpacing: "-0.01em",
      }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--forest)")}
        onMouseLeave={e => (e.currentTarget.style.background = "var(--forest-mid)")}
      >
        <IcoUser />
        Sign in
      </button>
    );
  }

  const displayName = auth.user.user_metadata?.full_name ?? auth.user.email?.split("@")[0] ?? "User";
  const initials    = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const avatarUrl   = auth.user.user_metadata?.avatar_url;

  return (
    <div ref={triggerRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "4px 10px 4px 4px", borderRadius: "var(--r-pill)",
          cursor: "pointer",
          fontFamily: "var(--font-body)",
          background: open ? "var(--cream)" : "var(--white)",
          border: `1.5px solid ${open ? "var(--forest-mid)" : "var(--b2)"}`,
          boxShadow: open ? "var(--s-focus)" : "var(--s1)",
          transition: "all 120ms ease",
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
          background: "var(--forest-mid)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {avatarUrl
            ? <Image src={avatarUrl} alt={displayName} width={26} height={26} style={{ objectFit: "cover" }} />
            : <span style={{ fontSize: 10, fontWeight: 600, color: "white", letterSpacing: "-0.02em" }}>{initials}</span>
          }
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayName}
        </span>
        <IcoChevron open={open} />
      </button>

      {open && mounted && (
        <DropdownPanel anchorRef={triggerRef} auth={auth} onClose={close} />
      )}
    </div>
  );
}
