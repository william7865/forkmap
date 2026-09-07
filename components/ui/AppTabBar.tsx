'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Bookmark, User } from 'lucide-react'
import { useEffect } from 'react'
import { lightTap } from '@/lib/native/haptics'
import { useUnreadMessages } from '@/lib/hooks/useUnreadMessages'
import { useImportsStore } from '@/lib/hooks/useImportsContext'
import { useAuth } from '@/lib/hooks/useAuth'
import { startPresence, stopPresence } from '@/lib/presence'

type Tab = {
  href: string
  icon: (active: boolean) => React.ReactNode
  label: string
  match: (p: string) => boolean
  badge?: 'messages' | 'imports'
}

// Une barre d'onglets porte des DESTINATIONS, pas des actions. Le bouton
// central surélevé « Surprise » a été retiré pour cette raison : c'était une
// action, et une action occasionnelle occupait la place la plus visible de
// l'app. Le concierge se déclenche maintenant depuis la carte (MapHome), où
// il est au bon endroit — on cherche où manger en regardant la carte.
//
// Carnet (l'accueil : ce que l'app promet) · Carte · Profil. Découvrir a été
// absorbé par le Carnet, en onglet « Amis » — il ne méritait pas une
// destination tant qu'il est vide pour qui n'a pas encore d'amis. Le badge
// des messages non lus suit donc les Messages, qui vivent derrière le Profil
// et l'onglet Amis.
const TABS: Tab[] = [
  {
    // En natif le Carnet EST `/` (app/page.tsx) ; sur le web il vit à
    // `/favorites`, `/` étant la landing. Les deux chemins sont actifs.
    href: '/',
    icon: (active) => <Bookmark size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Carnet',
    match: (p) => p === '/' || p.startsWith('/favorites'),
    badge: 'imports',
  },
  {
    href: '/carte',
    icon: (active) => <Map size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Carte',
    match: (p) => p.startsWith('/carte'),
  },
  {
    href: '/account',
    icon: (active) => <User size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Profil',
    match: (p) => p.startsWith('/account'),
    badge: 'messages',
  },
]

const labelStyle: React.CSSProperties = {
  fontSize: 9.5,
  fontWeight: 700,
  fontFamily: 'var(--font-body)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-label={label}
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
      {count > 9 ? '9+' : count}
    </span>
  )
}

function TabLink({ tab, active, badge }: { tab: Tab; active: boolean; badge: number }) {
  return (
    <Link
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
          padding: active ? '6px 12px' : '6px 8px',
          borderRadius: 14,
          background: active ? 'var(--surface-2)' : 'transparent',
          color: active ? 'var(--accent)' : 'var(--text-3)',
          transition: 'background 160ms ease, color 160ms ease',
        }}
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          {tab.icon(active)}
          <CountBadge
            count={badge}
            label={
              tab.badge === 'messages'
                ? `${badge} messages non lus`
                : `${badge} imports à confirmer`
            }
          />
        </span>
        <span style={labelStyle}>{tab.label}</span>
      </span>
    </Link>
  )
}

export default function AppTabBar() {
  const pathname = usePathname()
  const unread = useUnreadMessages()
  // Reads the app's single imports store (mounted in the root layout) — mounting
  // useImports here would start a SECOND background resolver.
  const { needsAttentionCount } = useImportsStore()
  const auth = useAuth()
  // Présence en ligne globale tant que l'app (barre d'onglets) est montée.
  useEffect(() => {
    const id = auth.user?.id
    if (id) startPresence(id)
    else stopPresence()
  }, [auth.user?.id])

  const badgeFor = (tab: Tab) =>
    tab.badge === 'messages' ? unread : tab.badge === 'imports' ? needsAttentionCount : 0

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
        // Au-dessus de la BottomSheet carte (900) et de la fiche mobile (900,
        // qui réserve déjà la hauteur de la barre). Sous les overlays plein
        // écran (≥1300).
        zIndex: 950,
        paddingBottom: 'var(--safe-bottom)',
        boxShadow: 'var(--s2)',
      }}
    >
      {TABS.map((tab) => (
        <TabLink key={tab.label} tab={tab} active={tab.match(pathname)} badge={badgeFor(tab)} />
      ))}
    </nav>
  )
}
