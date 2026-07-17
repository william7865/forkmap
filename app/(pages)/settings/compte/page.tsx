// ============================================================
// app/(pages)/settings/compte/page.tsx
// Native sub-route for account management.
// Renders AccountSettingsNative inside a native chrome wrapper.
// Not linked from web; also renders content if accessed on web.
// ============================================================
'use client'

import { useAuthGuard } from '@/lib/hooks/useAuthGuard'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import AccountSettingsNative from '@/components/settings/AccountSettingsNative'
import { ChevronLeft } from 'lucide-react'

export default function ComptePage() {
  const { isReady } = useAuthGuard()
  const isMobile = useIsMobile()

  if (!isReady) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid var(--border)',
            borderTop: '2px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* 3-column native top bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: 'calc(var(--safe-top) + 10px) 16px 0',
        }}
      >
        {/* Back button — left column */}
        <button
          onClick={() => history.back()}
          aria-label="Retour"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--text-3)',
            fontSize: 14,
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 0',
            fontFamily: 'inherit',
            justifySelf: 'start',
          }}
        >
          <ChevronLeft size={20} strokeWidth={1.9} />
          Retour
        </button>

        {/* Centered title — middle column */}
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
            fontFamily: 'inherit',
          }}
        >
          Identité &amp; accès
        </span>

        {/* Spacer — right column */}
        <div />
      </div>

      <main
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '20px 20px calc(var(--safe-bottom) + 96px)',
          width: '100%',
          boxSizing: 'border-box' as const,
        }}
      >
        <AccountSettingsNative isMobile={isMobile} />
      </main>
    </div>
  )
}
