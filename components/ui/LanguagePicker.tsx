// ── LanguagePicker — dropdown dans le header ─────────────────
"use client";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/useLanguage";

export default function LanguagePicker() {
  const { lang, setLang, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = languages.find(l => l.code === lang) ?? languages[0];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Change language"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 10px", borderRadius: "var(--r-md)",
          border: "1px solid var(--ink-10)", background: open ? "var(--off-white)" : "transparent",
          cursor: "pointer", fontSize: 12, fontWeight: 600,
          color: "var(--ink-60)", fontFamily: "var(--font-body)",
          transition: "all 120ms ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--off-white)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <span style={{ fontSize: 14 }}>{current.flag}</span>
        <span style={{ fontSize: 11 }}>{current.code.toUpperCase()}</span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "var(--white)", border: "1px solid var(--ink-10)",
          borderRadius: "var(--r-lg)", boxShadow: "0 8px 24px rgba(14,14,13,0.12)",
          minWidth: 148, zIndex: 1100, overflow: "hidden",
          animation: "dropIn 150ms var(--ease-out) both",
        }}>
          {languages.map((l, i) => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 14px", border: "none", background: "transparent",
              cursor: "pointer", textAlign: "left", fontFamily: "var(--font-body)",
              borderBottom: i < languages.length - 1 ? "1px solid var(--ink-10)" : "none",
              transition: "background 80ms",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--off-white)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 16 }}>{l.flag}</span>
              <span style={{ fontSize: 12, fontWeight: lang === l.code ? 700 : 500, color: lang === l.code ? "var(--forest-mid)" : "var(--ink)" }}>{l.label}</span>
              {lang === l.code && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--forest-mid)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes dropIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
