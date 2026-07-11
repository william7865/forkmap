'use client'
// GetAppBanner — dismissible web banner nudging visitors to the native app.
//
// Never shown inside the native app itself. Dismissal is remembered so a
// visitor who declines is not asked again. Store links + badges live in
// lib/app-invite and components/app/StoreBadges (placeholder links until the
// real ones are set at launch).
import { useEffect, useState } from 'react'
import { useIsNative } from '@/lib/native/platform'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import { detectPlatform, INVITE_DISMISS_KEY, type DevicePlatform } from '@/lib/app-invite'
import { StoreCTA, AppTile } from '@/components/app/StoreBadges'

export default function GetAppBanner() {
  const isNative = useIsNative()
  const isMobile = useIsMobile()
  const [platform, setPlatform] = useState<DevicePlatform>('unknown')
  const [dismissed, setDismissed] = useState(true) // hidden until we confirm on the client

  useEffect(() => {
    setPlatform(detectPlatform())
    try {
      setDismissed(localStorage.getItem(INVITE_DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  // Never inside the native app; never once dismissed; wait for platform.
  if (isNative || dismissed || platform === 'unknown') return null

  const close = () => {
    setDismissed(true)
    try {
      localStorage.setItem(INVITE_DISMISS_KEY, '1')
    } catch {
      /* storage disabled — banner just reappears next load, acceptable */
    }
  }

  return (
    <div
      role="complementary"
      aria-label="Télécharger l'application Forkmap"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        // Above the bottom nav (200), below sheets/modals/toasts so it never
        // covers an open place detail.
        zIndex: 800,
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        boxShadow: 'var(--s3)',
        padding: `16px 18px calc(16px + var(--safe-bottom, 0px))`,
        // Clear the mobile bottom nav (56px + border) so it never hides the bar.
        marginBottom: isMobile ? 'calc(57px + var(--safe-bottom, 0px))' : 0,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, flex: 1, minWidth: 220 }}>
        <AppTile />
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
            }}
          >
            Forkmap, en mieux dans l&apos;app
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
            Notifications, accès rapide, et la carte à portée de poche.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StoreCTA platform={platform} />
        <button
          type="button"
          onClick={close}
          aria-label="Fermer"
          style={{
            width: 30,
            height: 30,
            borderRadius: 'var(--r-sm)',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-3)',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
