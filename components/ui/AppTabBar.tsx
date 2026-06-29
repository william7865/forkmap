'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Heart, Users, User } from 'lucide-react'
import { IcoSparkle } from '@/components/icons'
import { lightTap } from '@/lib/native/haptics'

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
    icon: (active) => <IcoSparkle size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Surprends-moi',
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
    label: 'Amis',
    match: (p) => p.startsWith('/friends'),
  },
  {
    href: '/account',
    icon: (active) => <User size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Compte',
    match: (p) => p.startsWith('/account'),
  },
]

export default function AppTabBar() {
  const pathname = usePathname()
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
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              minHeight: 56,
              color: active ? 'var(--accent)' : 'var(--text-3)',
            }}
          >
            {tab.icon(active)}
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
    </nav>
  )
}
