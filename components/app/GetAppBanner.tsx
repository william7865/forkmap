'use client'
// GetAppBanner — dismissible web banner nudging visitors to the native app.
//
// Never shown inside the native app itself. Dismissal is remembered so a
// visitor who declines is not asked again. Store URLs come from lib/app-invite
// (placeholder links until the real ones are set at launch).
import { useEffect, useState } from 'react'
import { useIsNative } from '@/lib/native/platform'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import {
  storeLinks,
  detectPlatform,
  INVITE_DISMISS_KEY,
  type DevicePlatform,
} from '@/lib/app-invite'

// ── Brand marks, inline (CSP blocks external images) ──────
function AppleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.53c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.1 8.79.73 1.06 1.6 2.25 2.74 2.21 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.08 2.65-2.15.84-1.23 1.18-2.42 1.2-2.48-.03-.01-2.29-.88-2.31-3.48zM14.87 6.07c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.69-.92 2.69.97.07 1.97-.49 2.58-1.22z" />
    </svg>
  )
}
function PlayMark() {
  // Monochrome Play triangle (single-colour, on-brand).
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.2 2.3c-.3.2-.5.6-.5 1.1v17.2c0 .5.2.9.5 1.1l9.3-9.7L4.2 2.3zm11 7.6L6.4 1.5l11.3 6.5-2.5 1.9zm0 4.2 2.5 1.9L6.4 22.5l8.8-8.4zM18.8 10.6l2.6 1.5c.6.4.6 1.4 0 1.8l-2.6 1.5-2.8-2.4 2.8-2.4z" />
    </svg>
  )
}

function StoreBadge({
  href,
  mark,
  top,
  name,
}: {
  href: string
  mark: React.ReactNode
  top: string
  name: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        padding: '8px 14px',
        borderRadius: 'var(--r-md)',
        background: 'var(--accent)',
        color: 'var(--on-accent)',
        textDecoration: 'none',
        border: 'none',
        lineHeight: 1.1,
      }}
    >
      <span style={{ display: 'flex', flexShrink: 0 }}>{mark}</span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.85, letterSpacing: '0.02em' }}>
          {top}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>{name}</span>
      </span>
    </a>
  )
}

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

  const links = storeLinks()

  const close = () => {
    setDismissed(true)
    try {
      localStorage.setItem(INVITE_DISMISS_KEY, '1')
    } catch {
      /* storage disabled — banner just reappears next load, acceptable */
    }
  }

  const appStore = (
    <StoreBadge href={links.ios} mark={<AppleMark />} top="Télécharger sur" name="App Store" />
  )
  const playStore = (
    <StoreBadge href={links.android} mark={<PlayMark />} top="Disponible sur" name="Google Play" />
  )

  // On a phone we know the platform, so a single primary button is cleaner than
  // two badges. On desktop we can't know, so we show both.
  const cta =
    platform === 'ios' ? (
      appStore
    ) : platform === 'android' ? (
      playStore
    ) : (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {appStore}
        {playStore}
      </div>
    )

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
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: 'var(--accent)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <LogoMark />
        </div>
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
        {cta}
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

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g fill="none" stroke="#fff" strokeWidth={4.4} strokeLinecap="round">
        <path d="M24 9c-3.4 3.8 3.4 6 0 9.8" />
        <path d="M32 6c-3.4 3.8 3.4 6 0 9.8" />
        <path d="M40 9c-3.4 3.8 3.4 6 0 9.8" />
      </g>
      <rect x="11" y="27.5" width="42" height="5.4" rx="2.7" fill="#fff" />
      <path d="M15 34h34a17 17 0 0 1-34 0Z" fill="#fff" />
    </svg>
  )
}
