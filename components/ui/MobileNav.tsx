// components/ui/MobileNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";

const IcoMap = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const IcoBookmark = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
  </svg>
);

const IcoUser = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const TABS = [
  { href: "/",          label: "Carte",   icon: <IcoMap /> },
  { href: "/favorites", label: "Favoris", icon: <IcoBookmark /> },
  { href: "/account",   label: "Compte",  icon: <IcoUser /> },
] as const;

export default function MobileNav() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  if (!isMobile) return null;

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: "calc(60px + env(safe-area-inset-bottom, 0px))",
      background: "var(--white)",
      borderTop: "1px solid var(--ink-10)",
      display: "flex",
      alignItems: "stretch",
      zIndex: 1001,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      boxShadow: "0 -4px 24px rgba(14,14,13,0.08)",
      fontFamily: "var(--font-body)",
    }}>
      {TABS.map(({ href, label, icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              textDecoration: "none",
              color: isActive ? "var(--forest-mid)" : "var(--ink-40)",
              transition: "color 150ms ease",
              position: "relative",
            }}
          >
            {isActive && (
              <span style={{
                position: "absolute",
                top: 6,
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "var(--forest-mid)",
              }}/>
            )}
            {icon}
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 600 : 400,
              letterSpacing: "0.02em",
            }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
