'use client'
import { ChevronLeft, X } from 'lucide-react'

interface Props {
  progress?: { index: number; total: number } | null
  onBack?: () => void
  onClose?: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  cta?: React.ReactNode
}

export default function StepShell({
  progress,
  onBack,
  onClose,
  title,
  subtitle,
  children,
  cta,
}: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        background: 'var(--bg)',
        display: 'flex',
        justifyContent: 'center',
        animation: 'overlayIn 200ms ease both',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 'calc(var(--safe-top) + 10px)',
          paddingBottom: 'calc(var(--safe-bottom) + 16px)',
        }}
      >
        {/* Top row: back + close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            minHeight: 36,
          }}
        >
          {onBack ? (
            <button onClick={onBack} aria-label="Retour" style={iconBtn}>
              <ChevronLeft size={22} strokeWidth={1.9} />
            </button>
          ) : (
            <span style={{ width: 36 }} />
          )}
          {onClose ? (
            <button onClick={onClose} aria-label="Fermer" style={iconBtn}>
              <X size={20} strokeWidth={1.9} />
            </button>
          ) : (
            <span style={{ width: 36 }} />
          )}
        </div>

        {/* Progress */}
        {progress && (
          <div style={{ display: 'flex', gap: 5, padding: '6px 22px 0' }}>
            {Array.from({ length: progress.total }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: i < progress.index ? 'var(--accent)' : 'var(--bone)',
                  transition: 'background 200ms',
                }}
              />
            ))}
          </div>
        )}

        {/* Body (scrollable) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 24px 12px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              fontSize: 26,
              lineHeight: 1.1,
              color: 'var(--ink)',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.45 }}
            >
              {subtitle}
            </p>
          )}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column' }}>{children}</div>
        </div>

        {/* CTA */}
        {cta && <div style={{ padding: '8px 24px 0' }}>{cta}</div>}
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-3)',
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
}
