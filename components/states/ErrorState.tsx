// ============================================================
// components/states/ErrorState.tsx — reusable error state
// ============================================================
"use client";

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

const IcoAlert = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default function ErrorState({ title = "Something went wrong", message, onRetry }: Props) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 14,
      padding: "36px 24px", textAlign: "center",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: "var(--coral-pale)",
        border: "1px solid rgba(197,48,48,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--coral)",
      }}>
        <IcoAlert />
      </div>
      <div>
        <p style={{ margin: "0 0 5px", fontSize: 13, fontWeight: 700, color: "var(--ink-80)" }}>{title}</p>
        {message && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-60)", lineHeight: 1.65, maxWidth: 220 }}>{message}</p>
        )}
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{
          padding: "8px 18px", borderRadius: 999,
          border: "1.5px solid rgba(197,48,48,0.3)",
          background: "var(--coral-pale)",
          color: "var(--coral)", fontSize: 12, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
          transition: "all 120ms ease",
          display: "flex", alignItems: "center", gap: 6,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--coral)"; e.currentTarget.style.color = "white"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--coral-pale)"; e.currentTarget.style.color = "var(--coral)"; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
          </svg>
          Retry
        </button>
      )}
    </div>
  );
}
