// ============================================================
// components/ui/ToastStack.tsx
// Renders toasts in bottom-right, stacked with animations
// ============================================================
"use client";

import type { Toast } from "@/lib/hooks/useToast";

interface Props {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const IcoCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcoX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
const IcoInfo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
  </svg>
);

const STYLES = {
  success: { bg: "#dcfce7", border: "rgba(27,127,79,0.25)", color: "var(--green)", icon: <IcoCheck /> },
  error:   { bg: "var(--coral-pale)",   border: "rgba(197,48,48,0.25)",  color: "var(--coral)",   icon: <IcoX />   },
  info:    { bg: "var(--white)",   border: "var(--b2)",             color: "var(--forest-mid)", icon: <IcoInfo /> },
};

export default function ToastStack({ toasts, onDismiss }: Props) {
  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 2000,
      display: "flex", flexDirection: "column-reverse", gap: 8,
      alignItems: "center",
      pointerEvents: "none",
    }}>
      {toasts.map(toast => {
        const s = STYLES[toast.type];
        return (
          <div key={toast.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 16px",
            borderRadius: "var(--r-pill)",
            background: s.bg,
            border: `1px solid ${s.border}`,
            boxShadow: "var(--s3)",
            fontSize: 13, fontWeight: 600, color: "var(--ink)",
            animation: toast.leaving
              ? "toastOut 300ms var(--ease-out) both"
              : "toastIn 280ms var(--ease-out) both",
            pointerEvents: "auto",
            cursor: "pointer",
            minWidth: 180, maxWidth: 340,
            backdropFilter: "blur(8px)",
          }}
            onClick={() => onDismiss(toast.id)}
          >
            <span style={{ color: s.color, display: "flex", flexShrink: 0 }}>{s.icon}</span>
            <span style={{ flex: 1 }}>{toast.message}</span>
            {toast.action && (
              <button
                onClick={(e) => { e.stopPropagation(); toast.action!.onClick(); onDismiss(toast.id); }}
                style={{
                  marginLeft: 10, padding: "2px 8px",
                  background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 6, color: "inherit", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "var(--font-body)",
                }}
              >{toast.action.label}</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
