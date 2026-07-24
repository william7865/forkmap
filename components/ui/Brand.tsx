// ============================================================
// Brand.tsx — the Forkmap brand lockup (logo + wordmark)
// Extracted from PageLayout so SiteHeader can reuse it without a circular import.
// One lockup everywhere: NavRail, AppTabBar, the favicon and now the whole public
// site all carry the same steaming-bowl mark + fork·map wordmark.
// ============================================================
'use client'

import Link from 'next/link'
import { LogoMark } from '@/components/icons/Logo'

// ── Logo brandbook — le bol fumant, la marque courante ───
export function ForkmapLogo({ size = 30 }: { size?: number }) {
  const r = Math.round(size * 0.267)
  const ico = Math.round(size * 0.6)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: 'var(--ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: 'var(--s2)',
      }}
    >
      <LogoMark size={ico} color="white" />
    </div>
  )
}

// ── Wordmark brandbook — Fraunces italic ─────────────────
// `asLink={false}` for surfaces that already carry a link to the map (PageHeader),
// where a clickable wordmark would be a second identical target.
export function ForkmapWordmark({
  compact = false,
  asLink = true,
}: {
  compact?: boolean
  asLink?: boolean
}) {
  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: compact ? 7 : 9,
    textDecoration: 'none',
  } as const
  const inner = (
    <>
      <ForkmapLogo size={compact ? 24 : 30} />
      {!compact && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 20,
            letterSpacing: '-0.04em',
            color: 'var(--ink)',
            lineHeight: 1,
          }}
        >
          fork<em style={{ fontStyle: 'italic', color: 'var(--forest-mid)' }}>map</em>
        </span>
      )}
    </>
  )
  if (!asLink) return <div style={style}>{inner}</div>
  return (
    <Link href="/" style={style}>
      {inner}
    </Link>
  )
}
