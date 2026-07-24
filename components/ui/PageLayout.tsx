// ============================================================
// PageLayout.tsx — Layout brandbook canonique pour toutes les pages
// ForkmapLogo · ForkmapWordmark · PageHeader · InfoPage · GlobalFooter
// ============================================================
'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import { useIsNative } from '@/lib/native/platform'
import { ForkmapLogo, ForkmapWordmark } from './Brand'
import SiteHeader from '@/components/site/SiteHeader'

// The brand lockup now lives in Brand.tsx (shared with SiteHeader without a cycle).
// Re-exported here so existing `@/components/ui/PageLayout` importers keep working.
export { ForkmapLogo, ForkmapWordmark }

// ── Icônes header brandbook stroke 1.7 ───────────────────
const IcoArrowLeft = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
)

// ── PageHeader partagé — toutes les pages secondaires ────
export function PageHeader({ current, actions }: { current: string; actions?: ReactNode }) {
  const isMobile = useIsMobile()

  return (
    <header
      style={{
        height: 56,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 10,
        background: 'var(--white)',
        borderBottom: '1px solid var(--ink-10)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Back to map — the web map lives at /carte (native keeps it at / via AppTabBar). */}
      <Link
        href="/carte"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          textDecoration: 'none',
          color: 'var(--ink-40)',
          fontSize: 12,
          fontWeight: 500,
          padding: '5px 9px 5px 6px',
          borderRadius: 'var(--r-sm)',
          border: '1px solid transparent',
          transition: 'all 120ms ease',
          fontFamily: 'var(--font-body)',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--forest-mid)'
          e.currentTarget.style.background = 'var(--forest-pale)'
          e.currentTarget.style.borderColor = 'rgba(25,28,29,0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--ink-40)'
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.borderColor = 'transparent'
        }}
      >
        <IcoArrowLeft />
        {!isMobile && 'Carte'}
      </Link>

      {/* Separator */}
      <div style={{ width: 1, height: 16, background: 'var(--ink-10)', flexShrink: 0 }} />

      {/* Logo — icon only on mobile, full wordmark on desktop. Not a link: the
          back arrow beside it already goes to the map. */}
      {isMobile ? <ForkmapLogo size={28} /> : <ForkmapWordmark asLink={false} />}

      <div style={{ flex: 1 }} />

      {/* Custom actions slot */}
      {actions}

      {/* Current page pill */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--forest-mid)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          // letter-spacing trails the last glyph, so the right padding is trimmed to match
          padding: '4px 10px 4px 12px',
          borderRadius: 'var(--r-pill)',
          background: 'var(--forest-pale)',
          border: '1px solid rgba(25,28,29,0.18)',
          fontFamily: 'var(--font-body)',
          flexShrink: 0,
          whiteSpace: 'nowrap' as const,
        }}
      >
        {current}
      </span>
    </header>
  )
}

// ── LegalSection — titre + corps des pages légales (privacy, terms) ──
// The rule stops at the text measure rather than spanning the container:
// a hairline running past the last word reads as a border, not as typography.
export const PROSE_MEASURE = 620

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 44 }}>
      <h2
        style={{
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          margin: '0 0 16px',
          paddingBottom: 10,
          borderBottom: '1px solid var(--border)',
          maxWidth: PROSE_MEASURE,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: 14.5,
          // Long-form legal prose sits one step darker than UI copy: --ink-80, not --text-2.
          color: 'var(--ink-80)',
          lineHeight: 1.75,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: PROSE_MEASURE,
          textWrap: 'pretty',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ── InfoPage — wrapper complet pour pages statiques ──────
// On the web these are marketing/legal pages of the public SITE, so they wear the
// shared SiteHeader + GlobalFooter — the same chrome as the landing, not the app's
// NavRail. On native they're reached from inside the app, so they show only a
// history.back button (SiteHeader/GlobalFooter are web surfaces).
export function InfoPage({ children, maxWidth = 720 }: { children: ReactNode; maxWidth?: number }) {
  const isNative = useIsNative()
  return (
    <div
      style={{
        minHeight: '100vh',
        background: isNative ? 'var(--white)' : 'var(--off-white)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {!isNative && <SiteHeader />}
      <main style={{ flex: 1, background: 'var(--white)' }}>
        <div
          style={{
            maxWidth,
            margin: '0 auto',
            padding: isNative
              ? 'calc(var(--safe-top) + 8px) 20px calc(var(--safe-bottom) + 88px)'
              : '48px 24px 72px',
          }}
        >
          {isNative && (
            <button
              onClick={() => history.back()}
              aria-label="Retour"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-40)',
                fontSize: 14,
                fontWeight: 600,
                padding: 0,
                marginBottom: 18,
              }}
            >
              <IcoArrowLeft /> Retour
            </button>
          )}
          {children}
        </div>
      </main>
      {!isNative && <GlobalFooter />}
    </div>
  )
}

// ── GlobalFooter brandbook ────────────────────────────────
export function GlobalFooter() {
  const isMobile = useIsMobile()
  const year = new Date().getFullYear()

  // No "Navigation" column: NavRail (desktop) and BottomNav (mobile) already carry
  // Carte / Lieux enregistrés / Mon compte / Paramètres on every page.
  const cols = [
    {
      label: 'Découvrir',
      links: [
        { href: '/about', label: 'À propos' },
        { href: '/help', label: 'Aide & FAQ' },
        { href: '/contact', label: 'Contact' },
      ],
    },
    {
      label: 'Légal',
      links: [
        { href: '/privacy', label: 'Confidentialité' },
        { href: '/terms', label: "Conditions d'utilisation" },
        { href: '/attribution', label: 'Attribution des données' },
      ],
    },
  ]

  return (
    <footer
      style={{
        background: 'var(--off-white)',
        borderTop: '1px solid var(--ink-10)',
        padding: '44px 24px 32px',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr repeat(2, auto)',
            gap: isMobile ? 28 : 64,
            marginBottom: 40,
          }}
        >
          {/* Brand column */}
          <div>
            <ForkmapWordmark />
            <p
              style={{
                margin: '14px 0 0',
                fontSize: 12,
                color: 'var(--ink-40)',
                lineHeight: 1.7,
                maxWidth: 200,
              }}
            >
              Trouvez les meilleurs restaurants autour de vous.
            </p>
          </div>

          {/* Link columns */}
          {cols.map((col) => (
            <div key={col.label}>
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-40)',
                }}
              >
                {col.label}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    style={{
                      fontSize: 13,
                      color: 'var(--ink-60)',
                      textDecoration: 'none',
                      fontWeight: 400,
                      transition: 'color 120ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--forest-mid)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-60)')}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar — copyright only; the legal links live in their own column above */}
        <div style={{ borderTop: '1px solid var(--ink-10)', paddingTop: 20 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>© {year} Forkmap</span>
        </div>
      </div>
    </footer>
  )
}
