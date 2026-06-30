// ============================================================
// PageLayout.tsx — Layout brandbook canonique pour toutes les pages
// ForkmapLogo · ForkmapWordmark · PageHeader · InfoPage · GlobalFooter
// ============================================================
'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import { useIsNative } from '@/lib/native/platform'

// ── Logo fourchette brandbook ────────────────────────────
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
      <svg width={ico} height={ico} viewBox="0 0 24 24" fill="none">
        <path
          d="M9 4v8c0 2.5 1 4 3 4.5V21M15 4v5c0 1-.7 1.5-1.5 1.5S12 10 12 9V4M15 9.5c0 2 1.5 3 3 3V21"
          stroke="white"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

// ── Wordmark brandbook — Fraunces italic ─────────────────
export function ForkmapWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 7 : 9,
        textDecoration: 'none',
      }}
    >
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
    </Link>
  )
}

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
      {/* Back to map */}
      <Link
        href="/"
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
          e.currentTarget.style.borderColor = 'rgba(187,94,46,0.2)'
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

      {/* Logo — icon only on mobile, full wordmark on desktop */}
      {isMobile ? <ForkmapLogo size={28} /> : <ForkmapWordmark />}

      <div style={{ flex: 1 }} />

      {/* Custom actions slot */}
      {actions}

      {/* Current page pill */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--forest-mid)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '4px 10px',
          borderRadius: 'var(--r-pill)',
          background: 'var(--forest-pale)',
          border: '1px solid rgba(187,94,46,0.18)',
          fontFamily: 'var(--font-body)',
          flexShrink: 0,
          whiteSpace: 'nowrap' as const,
        }}
      >
        <span
          style={{ display: 'block', width: 10, height: 1.5, background: 'var(--forest-mid)' }}
        />
        {current}
      </span>
    </header>
  )
}

// ── InfoPage — wrapper complet pour pages statiques ──────
export function InfoPage({
  children,
  headerLabel,
  headerActions,
  maxWidth = 720,
}: {
  children: ReactNode
  headerLabel: string
  headerActions?: ReactNode
  maxWidth?: number
}) {
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
      {!isNative && <PageHeader current={headerLabel} actions={headerActions} />}
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

  const cols = [
    {
      label: 'Navigation',
      links: [
        { href: '/', label: 'Carte' },
        { href: '/favorites', label: 'Lieux sauvegardés' },
        { href: '/account', label: 'Mon compte' },
        { href: '/settings', label: 'Paramètres' },
      ],
    },
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
            gridTemplateColumns: isMobile ? '1fr' : '1fr repeat(3, auto)',
            gap: isMobile ? 28 : 48,
            marginBottom: 40,
          }}
        >
          {/* Brand column */}
          <div>
            <ForkmapWordmark />
            <p
              style={{
                margin: '14px 0 10px',
                fontSize: 12,
                color: 'var(--ink-40)',
                lineHeight: 1.7,
                maxWidth: 200,
              }}
            >
              Trouvez les meilleurs restaurants autour de vous, grâce aux données ouvertes.
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-20)' }}>
              © OpenStreetMap contributors
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

        {/* Bottom bar */}
        <div
          style={{
            borderTop: '1px solid var(--ink-10)',
            paddingTop: 20,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: isMobile ? 'flex-start' : 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--ink-20)' }}>
            © {year} Forkmap · Données © OpenStreetMap contributors (ODbL)
          </span>
          <div style={{ display: 'flex', gap: 18 }}>
            {[
              { href: '/privacy', label: 'Confidentialité' },
              { href: '/terms', label: 'Conditions' },
              { href: '/attribution', label: 'Attribution' },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  fontSize: 11,
                  color: 'var(--ink-20)',
                  textDecoration: 'none',
                  transition: 'color 120ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink-60)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-20)')}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
