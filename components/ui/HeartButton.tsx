// ============================================================
// components/ui/HeartButton.tsx
// Animated heart button with burst particles on add
// Pure CSS animations, no external deps
// ============================================================
"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  isFavorite: boolean;
  size?: number;
  onClick: (e: React.MouseEvent) => void;
  ariaLabel?: string;
}

// Particle burst on "add" — 6 tiny dots that fly outward
function Particles({ active }: { active: boolean }) {
  if (!active) return null;

  const particles = [
    { tx: "-18px", ty: "-16px" },
    { tx: "18px",  ty: "-16px" },
    { tx: "20px",  ty: "2px"   },
    { tx: "-20px", ty: "2px"   },
    { tx: "10px",  ty: "16px"  },
    { tx: "-10px", ty: "16px"  },
  ];

  const colors = ["var(--accent)", "var(--forest-mid)", "var(--green)", "var(--sky)"];

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 5, height: 5,
          borderRadius: "50%",
          background: colors[i % colors.length],
          marginTop: -2.5, marginLeft: -2.5,
          // CSS custom properties for the animation
          // @ts-expect-error CSS vars
          "--tx": p.tx, "--ty": p.ty,
          animation: `heartParticle 500ms ${i * 40}ms cubic-bezier(0.16, 1, 0.3, 1) both`,
        }}/>
      ))}
    </div>
  );
}

export default function HeartButton({ isFavorite, size = 15, onClick, ariaLabel }: Props) {
  const [animState, setAnimState] = useState<"idle" | "adding" | "removing">("idle");
  const prevFav = useRef(isFavorite);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    if (prevFav.current === isFavorite) return;
    prevFav.current = isFavorite;

    if (isFavorite) {
      setAnimState("adding");
      setShowParticles(true);
      const t1 = setTimeout(() => setAnimState("idle"), 600);
      const t2 = setTimeout(() => setShowParticles(false), 700);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setAnimState("removing");
      const t = setTimeout(() => setAnimState("idle"), 400);
      return () => clearTimeout(t);
    }
  }, [isFavorite]);

  const heartStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    animation: animState === "adding"
      ? "heartBeat 550ms cubic-bezier(0.16, 1, 0.3, 1) both"
      : animState === "removing"
      ? "heartUnbeat 350ms ease both"
      : "none",
  };

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(e); }}
      aria-label={ariaLabel ?? (isFavorite ? "Remove from saved" : "Save restaurant")}
      style={{
        position: "relative",
        background: "none", border: "none", cursor: "pointer",
        padding: "3px",
        color: isFavorite ? "var(--accent)" : "var(--ink-40)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "color 150ms ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <Particles active={showParticles} />
      <div style={heartStyle}>
        <svg
          width={size} height={size}
          viewBox="0 0 24 24"
          fill={isFavorite ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ display: "block", transition: "fill 150ms ease" }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </div>
    </button>
  );
}
