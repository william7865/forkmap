'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Heart, Users, User, Compass } from 'lucide-react'
import { useEffect } from 'react'
import { lightTap } from '@/lib/native/haptics'
import { useUnreadMessages } from '@/lib/hooks/useUnreadMessages'
import { useAuth } from '@/lib/hooks/useAuth'
import { startPresence, stopPresence } from '@/lib/presence'

type Tab = {
  href: string
  icon: (active: boolean) => React.ReactNode
  label: string
  match: (p: string) => boolean
}

const TABS: Tab[] = [
  {
    href: '/',
    icon: (active) => <Map size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Carte',
    match: (p) => p === '/',
  },
  {
    href: '/?surprise=1',
    icon: (active) => <Compass size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Explorer',
    match: () => false,
  },
  {
    href: '/favorites',
    icon: (active) => <Heart size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Favoris',
    match: (p) => p.startsWith('/favorites'),
  },
  {
    href: '/friends',
    icon: (active) => <Users size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Social',
    match: (p) => p.startsWith('/friends'),
  },
  {
    href: '/account',
    icon: (active) => <User size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Profil',
    match: (p) => p.startsWith('/account'),
  },
]

export default function AppTabBar() {
  const pathname = usePathname()
  const unread = useUnreadMessages()
  const auth = useAuth()
  // Présence en ligne globale tant que l'app (barre d'onglets) est montée.
  useEffect(() => {
    const id = auth.user?.id
    if (id) startPresence(id)
    else stopPresence()
  }, [auth.user?.id])
  return (
    <nav
      aria-label="Navigation principale"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        zIndex: 200,
        paddingBottom: 'var(--safe-bottom)',
        boxShadow: 'var(--s2)',
      }}
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname)
        return (
          <Link
            key={tab.label}
            href={tab.href}
            onClick={() => lightTap()}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              textDecoration: 'none',
              minHeight: 56,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: active ? '6px 16px' : '6px 10px',
                borderRadius: 14,
                background: active ? 'var(--surface-2)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-3)',
                transition: 'background 160ms ease, color 160ms ease',
              }}
            >
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                {tab.icon(active)}
                {tab.href === '/friends' && unread > 0 && (
                  <span
                    aria-label={`${unread} messages non lus`}
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -8,
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      borderRadius: 999,
                      background: '#e5484d',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: '16px',
                      textAlign: 'center',
                      border: '2px solid var(--bg)',
                    }}
                  >
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {tab.label}
              </span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
