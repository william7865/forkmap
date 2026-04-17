'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth, getSupabaseBrowserClient } from '@/lib/hooks/useAuth'

const TABS = [
  { href: '/', icon: '🗺', label: 'Carte' },
  { href: '/favorites', icon: '♡', label: 'Favoris' },
  { href: '/account', icon: '◎', label: 'Compte' },
]

const MORE_LINKS = [
  { href: '/settings', label: 'Paramètres' },
  { href: '/help', label: 'Aide' },
  { href: '/about', label: 'À propos' },
  { href: '/contact', label: 'Contact' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const auth = useAuth()
  const [sheet, setSheet] = useState(false)
  const sb = getSupabaseBrowserClient()

  useEffect(() => {
    if (!sheet) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheet(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [sheet])

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          minHeight: 56,
          background: 'var(--white)',
          borderTop: '1px solid var(--ink-10)',
          display: 'flex',
          zIndex: 200,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href + '/'))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                textDecoration: 'none',
                minHeight: 44,
              }}
            >
              {active && (
                <div
                  style={{
                    width: 32,
                    height: 3,
                    borderRadius: 'var(--r-pill)',
                    background: 'var(--forest-mid)',
                    marginBottom: 3,
                    transition: 'width 200ms var(--ease-spring)',
                  }}
                />
              )}
              <span aria-hidden="true" style={{ fontSize: 18, opacity: active ? 1 : 0.55 }}>
                {tab.icon}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: active ? 'var(--forest-mid)' : 'var(--ink-40)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}

        {/* Plus tab */}
        <button
          onClick={() => setSheet(true)}
          aria-label="Plus d'options"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            minHeight: 44,
            minWidth: 44,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18 }}>
            ⋯
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--ink-40)',
              fontFamily: 'var(--font-body)',
            }}
          >
            Plus
          </span>
        </button>
      </nav>

      {/* "Plus" bottom sheet */}
      {sheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }} onClick={() => setSheet(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,14,13,0.4)' }} />
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Plus d'options"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--white)',
              borderRadius: '20px 20px 0 0',
              padding: '8px 0 32px',
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'var(--bone)',
                margin: '8px auto 16px',
              }}
            />
            {MORE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setSheet(false)}
                style={{
                  display: 'block',
                  padding: '14px 24px',
                  fontSize: 15,
                  color: 'var(--ink-80)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-body)',
                  borderBottom: '1px solid var(--ink-10)',
                }}
              >
                {l.label}
              </Link>
            ))}
            {auth.user ? (
              <button
                onClick={async () => {
                  try {
                    await sb.auth.signOut()
                  } catch {
                    /* ignore */
                  } finally {
                    setSheet(false)
                  }
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px 24px',
                  textAlign: 'left',
                  fontSize: 15,
                  color: 'var(--coral)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Se déconnecter
              </button>
            ) : (
              <Link
                href="/?auth=required"
                onClick={() => setSheet(false)}
                style={{
                  display: 'block',
                  padding: '14px 24px',
                  fontSize: 15,
                  color: 'var(--forest-mid)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
