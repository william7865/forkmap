'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { useAuth, getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { Map, Bookmark, User, MoreHorizontal, LogOut } from 'lucide-react'

// Mirrors NavRail so the same destinations are reachable on both breakpoints.
const TABS = [
  { href: '/', Icon: Map, label: 'Carte' },
  { href: '/favorites', Icon: Bookmark, label: 'Enregistrés' },
  { href: '/account', Icon: User, label: 'Compte' },
]

const MORE_LINKS = [
  { href: '/settings', label: 'Paramètres' },
  { href: '/help', label: 'Aide' },
  { href: '/about', label: 'À propos' },
  { href: '/contact', label: 'Contact' },
  { href: '/attribution', label: 'Attribution' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const auth = useAuth()
  const [sheet, setSheet] = useState(false)
  const sb = useMemo(() => getSupabaseBrowserClient(), [])

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
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
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
                gap: 3,
                textDecoration: 'none',
                minHeight: 56,
                color: active ? 'var(--accent)' : 'var(--text-3)',
              }}
            >
              <tab.Icon size={20} strokeWidth={active ? 2 : 1.75} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                  fontFamily: 'var(--font-body)',
                  letterSpacing: 0,
                }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}

        <button
          onClick={() => setSheet(true)}
          aria-label="Plus d'options"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            minHeight: 56,
            minWidth: 44,
            color: 'var(--text-3)',
          }}
        >
          <MoreHorizontal size={20} strokeWidth={1.75} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 400,
              fontFamily: 'var(--font-body)',
            }}
          >
            Plus
          </span>
        </button>
      </nav>

      {sheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }} onClick={() => setSheet(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
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
              background: 'var(--bg)',
              borderRadius: '16px 16px 0 0',
              padding: '8px 0',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'var(--surface-2)',
                margin: '8px auto 12px',
              }}
            />
            {MORE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setSheet(false)}
                style={{
                  display: 'block',
                  padding: '14px 20px',
                  fontSize: 15,
                  color: 'var(--text)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {l.label}
              </Link>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '14px 20px',
                  textAlign: 'left',
                  fontSize: 15,
                  color: 'var(--coral)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <LogOut size={16} strokeWidth={1.75} />
                Se déconnecter
              </button>
            ) : (
              <Link
                href="/?auth=required"
                onClick={() => setSheet(false)}
                style={{
                  display: 'block',
                  padding: '14px 20px',
                  fontSize: 15,
                  color: 'var(--accent)',
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
