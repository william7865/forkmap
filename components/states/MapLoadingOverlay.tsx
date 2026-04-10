// ============================================================
// components/states/MapLoadingOverlay.tsx
// Subtle top-bar progress + spinner for map operations.
// Non-blocking — stays above map without hiding content.
// ============================================================
"use client";

interface Props {
  loading?: boolean;
  enriching?: boolean;
  routeLoading?: boolean;
}

export default function MapLoadingOverlay({ loading, enriching, routeLoading }: Props) {
  const active = loading || enriching || routeLoading;

  const label = loading
    ? "Loading restaurants…"
    : routeLoading
    ? "Calculating route…"
    : "Enriching data…";

  return (
    <>
      {/* Top progress bar */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 1100,
        overflow: "hidden",
        opacity: active ? 1 : 0,
        transition: "opacity 300ms ease",
        pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute",
          top: 0,
          left: "-50%",
          width: "50%",
          height: "100%",
          background: "linear-gradient(90deg, transparent, var(--forest-mid), transparent)",
          animation: active ? "mapProgress 1.4s ease-in-out infinite" : "none",
        }} />
      </div>

      {/* Floating pill — only shown for route loading (more impactful) */}
      {routeLoading && (
        <div style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1100,
          background: "rgba(28,25,23,0.88)",
          backdropFilter: "blur(12px)",
          color: "white",
          fontSize: 11,
          fontWeight: 600,
          padding: "6px 14px",
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          gap: 7,
          animation: "fadeDown 180ms ease both",
          pointerEvents: "none",
          letterSpacing: "0.02em",
        }}>
          <div style={{
            width: 10,
            height: 10,
            border: "2px solid rgba(255,255,255,0.3)",
            borderTop: "2px solid white",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }} />
          {label}
        </div>
      )}

      <style>{`
        @keyframes mapProgress {
          0%   { left: -50%; }
          100% { left: 100%; }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
}
