'use client'

import { useAuthGuard } from '@/lib/hooks/useAuthGuard'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import { useIsNative } from '@/lib/native/platform'
import AccountSettingsContent from '@/components/settings/AccountSettingsContent'
import { ChevronLeft } from 'lucide-react'

export default function ComptePage() {
  const { isReady } = useAuthGuard()
  const isMobile = useIsMobile()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isNative = useIsNative()

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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
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
          padding: 'calc(var(--safe-top) + 10px) 18px 0',
          fontFamily: 'inherit',
        }}
      >
        <ChevronLeft size={20} strokeWidth={1.9} /> Retour
      </button>
      <main
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '16px 20px calc(var(--safe-bottom) + 96px)',
          width: '100%',
          boxSizing: 'border-box' as const,
        }}
      >
        <AccountSettingsContent isMobile={isMobile} />
      </main>
    </div>
  )
}
