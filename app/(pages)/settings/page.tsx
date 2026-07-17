// ============================================================
// app/(pages)/settings/page.tsx — Paramètres
// WEB: full editorial account-management page (unchanged).
// NATIVE: SettingsHub (grouped list of links).
// ============================================================
'use client'

import { PageHeader, GlobalFooter } from '@/components/ui/PageLayout'
import { useAuthGuard } from '@/lib/hooks/useAuthGuard'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import { useIsNative } from '@/lib/native/platform'
import AccountSettingsContent from '@/components/settings/AccountSettingsContent'
import SettingsHub from '@/components/settings/SettingsHub'

export default function SettingsPage() {
  const { isReady } = useAuthGuard()
  const isMobile = useIsMobile()
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
      </div>
    )
  }

  if (isNative) return <SettingsHub />

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PageHeader current="Paramètres" />
      <main
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: isMobile ? '28px 20px 110px' : '52px 32px 96px',
          width: '100%',
          boxSizing: 'border-box' as const,
        }}
      >
        <AccountSettingsContent isMobile={isMobile} />
      </main>
      <GlobalFooter />
    </div>
  )
}
