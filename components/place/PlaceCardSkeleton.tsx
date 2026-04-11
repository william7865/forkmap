export default function PlaceCardSkeleton() {
  return (
    <div style={{
      height: 262, borderRadius: 16, overflow: "hidden",
      background: "var(--off-white)", border: "1px solid var(--ink-10)",
      marginBottom: 8, position: "relative",
    }}>
      {/* Photo area shimmer */}
      <div style={{ height: 160, background: "var(--bone)", position: "relative", overflow: "hidden" }}>
        <div className="shimmer-bar" style={{ position: "absolute", inset: 0 }} />
      </div>
      {/* Text lines */}
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ height: 14, borderRadius: 4, background: "var(--bone)", width: "70%", position: "relative", overflow: "hidden" }}>
          <div className="shimmer-bar" style={{ position: "absolute", inset: 0 }} />
        </div>
        <div style={{ height: 10, borderRadius: 4, background: "var(--bone)", width: "45%", position: "relative", overflow: "hidden" }}>
          <div className="shimmer-bar" style={{ position: "absolute", inset: 0 }} />
        </div>
        <div style={{ height: 10, borderRadius: 4, background: "var(--bone)", width: "55%", position: "relative", overflow: "hidden" }}>
          <div className="shimmer-bar" style={{ position: "absolute", inset: 0 }} />
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%);
          animation: shimmer 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
