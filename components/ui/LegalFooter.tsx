"use client";

import Link from "next/link";

export function LegalFooter() {
  return (
    <footer style={{
      borderTop: "1px solid rgba(28,25,23,0.07)",
      padding: "20px 24px",
      display: "flex",
      flexWrap: "wrap",
      gap: "8px 20px",
      justifyContent: "center",
      alignItems: "center",
    }}>
      {[
        { href: "/", label: "← Map" },
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
        { href: "/attribution", label: "Data attribution" },
      ].map(({ href, label }) => (
        <Link key={href} href={href} style={{
          fontSize: 12, fontWeight: 600,
          color: "var(--ink-60)",
          textDecoration: "none",
          transition: "color 120ms",
        }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-60)")}
        >
          {label}
        </Link>
      ))}
      <span style={{ fontSize: 11, color: "var(--ink-40)" }}>
        © {new Date().getFullYear()} Forkmap
      </span>
    </footer>
  );
}
