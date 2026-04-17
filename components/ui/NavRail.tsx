'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth, getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Map, Heart, User, Settings, LogOut } from 'lucide-react'

const NAV = [
  { href: '/', Icon: Map, label: 'Carte' },
  { href: '/favorites', Icon: Heart, label: 'Enregistré' },
  { href: '/account', Icon: User, label: 'Compte' },
]

const SECONDARY = [
  { href: '/help', label: 'Aide' },
  { href: '/about', label: 'À propos' },
  { href: '/contact', label: 'Contact' },
]

export default function NavRail() {
  const pathname = usePathname()
  const auth = useAuth()
  const [popover, setPopover] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const sb = useMemo(() => getSupabaseBrowserClient(), [])

  useEffect(() => {
    if (!popover) return
    const handler = (e: MouseEvent) => {
      if (!avatarRef.current?.contains(e.target as Node)) setPopover(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popover])

  const initials =
    auth.user?.user_metadata?.full_name
      ?.trim()
      ?.split(' ')
      .filter(Boolean)
      .map((w: string) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ??
    auth.user?.email?.[0].toUpperCase() ??
    '?'

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 56,
        background: 'var(--bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        zIndex: 200,
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ marginBottom: 20, textDecoration: 'none' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 4v8c0 2.5 1 4 3 4.5V21M15 4v5c0 1-.7 1.5-1.5 1.5S12 10 12 9V4M15 9.5c0 2 1.5 3 3 3V21"
              stroke="white"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </Link>

      {/* Nav items */}
      {NAV.map(({ href, Icon, label }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-current={active ? 'page' : undefined}
            style={{ textDecoration: 'none', marginBottom: 2 }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: active ? 'var(--accent-light)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 120ms ease',
                color: active ? 'var(--accent)' : 'var(--text-3)',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface)'
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.75} />
            </div>
          </Link>
        )
      })}

      <div style={{ flex: 1 }} />

      {/* Settings */}
      <Link
        href="/settings"
        title="Paramètres"
        aria-current={pathname === '/settings' ? 'page' : undefined}
        style={{ textDecoration: 'none', marginBottom: 8 }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: pathname === '/settings' ? 'var(--accent-light)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: pathname === '/settings' ? 'var(--accent)' : 'var(--text-3)',
            transition: 'background 120ms ease',
          }}
          onMouseEnter={(e) => {
            if (pathname !== '/settings')
              (e.currentTarget as HTMLElement).style.background = 'var(--surface)'
          }}
          onMouseLeave={(e) => {
            if (pathname !== '/settings')
              (e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <Settings size={18} strokeWidth={1.75} />
        </div>
      </Link>

      {/* Avatar */}
      <div ref={avatarRef} style={{ position: 'relative' }}>
        <button
          aria-label="Mon compte"
          aria-expanded={popover}
          onClick={() => setPopover((v) => !v)}
          style={{
            width: 32,
            height: 32,
            minWidth: 44,
            minHeight: 44,
            borderRadius: '50%',
            background: auth.user ? 'var(--accent)' : 'var(--surface-2)',
            border: 'none',
            cursor: 'pointer',
            color: auth.user ? 'white' : 'var(--text-3)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {auth.user ? initials : <User size={15} strokeWidth={1.75} />}
        </button>

        {popover && (
          <div
            style={{
              position: 'absolute',
              bottom: 44,
              left: 8,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: 'var(--s3)',
              padding: '6px 0',
              minWidth: 168,
              zIndex: 300,
            }}
          >
            {SECONDARY.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                onClick={() => setPopover(false)}
                style={{
                  display: 'block',
                  padding: '8px 14px',
                  fontSize: 13,
                  color: 'var(--text)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-body)',
                  transition: 'background 100ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {s.label}
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
                    setPopover(false)
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 14px',
                  textAlign: 'left',
                  fontSize: 13,
                  color: 'var(--coral)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <LogOut size={14} strokeWidth={1.75} />
                Se déconnecter
              </button>
            ) : (
              <Link
                href="/?auth=required"
                onClick={() => setPopover(false)}
                style={{
                  display: 'block',
                  padding: '8px 14px',
                  fontSize: 13,
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
        )}
      </div>
    </nav>
  )
}
