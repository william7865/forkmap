// ============================================================
// components/states/EmptyState.tsx — reusable empty state
// Variants: no-results, no-favorites, no-location, no-area
// ============================================================
"use client";

interface Props {
  variant: "no-results" | "no-favorites" | "no-area" | "no-location";
  searchQuery?: string;
  onReset?: () => void;
  onExplore?: () => void;
}

const CONFIG = {
  "no-results": {
    emoji: "🔍",
    title: "No results found",
    desc: (q?: string) => q ? `No restaurants match "${q}"` : "No restaurants match your filters",
    cta: "Reset filters",
  },
  "no-favorites": {
    emoji: "🍽",
    title: "Nothing saved yet",
    desc: () => "Tap the ♡ on any restaurant to save it here",
    cta: "Explore map",
  },
  "no-area": {
    emoji: "📍",
    title: "No restaurants here",
    desc: () => "Move the map to explore a new area",
    cta: null,
  },
  "no-location": {
    emoji: "📡",
    title: "Location not set",
    desc: () => "Set a starting point to see distances and routes",
    cta: null,
  },
};

export default function EmptyState({ variant, searchQuery, onReset, onExplore }: Props) {
  const c = CONFIG[variant];
  const hasCta = c.cta && (onReset || onExplore);
  const ctaFn = onReset ?? onExplore;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 14,
      padding: "40px 24px", textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 18,
        background: "rgba(28,25,23,0.04)",
        border: "1px solid var(--b1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26,
      }}>
        {c.emoji}
      </div>
      <div>
        <p style={{ margin: "0 0 5px", fontSize: 13, fontWeight: 600, color: "var(--ink-80)", letterSpacing: "-0.02em" }}>
          {c.title}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-60)", lineHeight: 1.65 }}>
          {c.desc(searchQuery)}
        </p>
      </div>
      {hasCta && ctaFn && (
        <button onClick={ctaFn} style={{
          padding: "8px 18px", borderRadius: 999,
          border: "1.5px solid var(--forest-mid)",
          background: "rgba(45,122,85,0.15)",
          color: "var(--forest)", fontSize: 12, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
          transition: "all 120ms ease",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--forest-mid)"; e.currentTarget.style.color = "white"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(45,122,85,0.15)"; e.currentTarget.style.color = "var(--forest)"; }}
        >
          {c.cta}
        </button>
      )}
    </div>
  );
}
