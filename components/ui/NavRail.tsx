'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Bookmark, User, Settings } from 'lucide-react'
import { LogoMark } from '@/components/icons/Logo'

const NAV = [
  { href: '/', Icon: Map, label: 'Carte' },
  { href: '/favorites', Icon: Bookmark, label: 'Lieux enregistrés' },
  { href: '/account', Icon: User, label: 'Compte' },
]

export default function NavRail() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 52,
        background: 'var(--bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        zIndex: 500,
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
          <LogoMark size={18} color="white" />
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
        style={{ textDecoration: 'none' }}
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
    </nav>
  )
}
