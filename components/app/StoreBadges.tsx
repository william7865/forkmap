'use client'
// Shared store badges — used by both the persistent banner (GetAppBanner) and
// the one-time interstitial (AppInviteModal). Brand marks are inline SVG because
// the site CSP blocks external images; swap for official badges at launch if the
// store guidelines require it.
import { storeLinks, type DevicePlatform } from '@/lib/app-invite'

function AppleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.53c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.1 8.79.73 1.06 1.6 2.25 2.74 2.21 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.08 2.65-2.15.84-1.23 1.18-2.42 1.2-2.48-.03-.01-2.29-.88-2.31-3.48zM14.87 6.07c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.69-.92 2.69.97.07 1.97-.49 2.58-1.22z" />
    </svg>
  )
}

function PlayMark() {
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
  full,
}: {
  href: string
  mark: React.ReactNode
  top: string
  name: string
  full?: boolean
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: full ? 'center' : 'flex-start',
        gap: 9,
        padding: full ? '12px 18px' : '8px 14px',
        borderRadius: 'var(--r-md)',
        background: 'var(--accent)',
        color: 'var(--on-accent)',
        textDecoration: 'none',
        border: 'none',
        lineHeight: 1.1,
        width: full ? '100%' : undefined,
        boxShadow: full ? 'var(--s-accent)' : undefined,
      }}
    >
      <span style={{ display: 'flex', flexShrink: 0 }}>{mark}</span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.85, letterSpacing: '0.02em' }}>
          {top}
        </span>
        <span style={{ fontSize: full ? 15 : 13, fontWeight: 700, letterSpacing: '-0.01em' }}>
          {name}
        </span>
      </span>
    </a>
  )
}

/**
 * The store call-to-action, sized to the platform. On a phone we know the OS, so
 * one primary badge; on desktop (or unknown) we show both.
 * `full` stretches badges to fill their row — used by the interstitial.
 */
export function StoreCTA({ platform, full }: { platform: DevicePlatform; full?: boolean }) {
  const links = storeLinks()
  const apple = (
    <StoreBadge
      href={links.ios}
      mark={<AppleMark />}
      top="Télécharger sur"
      name="App Store"
      full={full}
    />
  )
  const play = (
    <StoreBadge
      href={links.android}
      mark={<PlayMark />}
      top="Disponible sur"
      name="Google Play"
      full={full}
    />
  )
  if (platform === 'ios') return apple
  if (platform === 'android') return play
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        flexDirection: full ? 'column' : 'row',
      }}
    >
      {apple}
      {play}
    </div>
  )
}

/** The steaming-bowl mark on the accent tile, shared by both surfaces. */
export function AppTile({ size = 40 }: { size?: number }) {
  const ico = Math.round(size * 0.55)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: 'var(--accent)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={ico} height={ico} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <g fill="none" stroke="#fff" strokeWidth={4.4} strokeLinecap="round">
          <path d="M24 9c-3.4 3.8 3.4 6 0 9.8" />
          <path d="M32 6c-3.4 3.8 3.4 6 0 9.8" />
          <path d="M40 9c-3.4 3.8 3.4 6 0 9.8" />
        </g>
        <rect x="11" y="27.5" width="42" height="5.4" rx="2.7" fill="#fff" />
        <path d="M15 34h34a17 17 0 0 1-34 0Z" fill="#fff" />
      </svg>
    </div>
  )
}
