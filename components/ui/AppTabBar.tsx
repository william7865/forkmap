'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Bookmark, User, Compass } from 'lucide-react'
import { useEffect } from 'react'
import { lightTap } from '@/lib/native/haptics'
import { SigSparkle } from '@/components/icons/signature'
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

// IA sociale : Carte (explorer la ville) · Découvrir (le fil — les Messages
// vivent derrière, d'où le badge non-lus ici) · Surprise (bouton central
// signature, rendu à part) · Enregistrés · Profil.
const LEFT_TABS: Tab[] = [
  {
    href: '/',
    icon: (active) => <Map size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Carte',
    match: (p) => p === '/',
  },
  {
    href: '/discover',
    icon: (active) => <Compass size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Découvrir',
    match: (p) =>
      p.startsWith('/discover') || p.startsWith('/messages') || p.startsWith('/friends'),
    badge: 'messages',
  },
]

const RIGHT_TABS: Tab[] = [
  {
    href: '/favorites',
    icon: (active) => <Bookmark size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Enregistrés',
    match: (p) => p.startsWith('/favorites'),
    badge: 'imports',
  },
  {
    href: '/account',
    icon: (active) => <User size={22} strokeWidth={active ? 2 : 1.75} />,
    label: 'Profil',
    match: (p) => p.startsWith('/account'),
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

// Le geste signature de la marque, toujours à portée de pouce : cercle encre
// surélevé, étincelle dorée. Ouvre le concierge (SurpriseSheet) via ?surprise=1.
function SurpriseButton() {
  return (
    <Link
      href="/?surprise=1"
      onClick={() => lightTap()}
      aria-label="Surprise — je ne sais pas quoi manger"
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
          gap: 4,
          padding: '6px 8px',
        }}
      >
        <span
          className="tap-press"
          style={{
            width: 50,
            height: 50,
            marginTop: -28,
            borderRadius: 999,
            background: 'var(--accent)',
            color: 'var(--star)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--s-accent)',
            border: '3px solid var(--bg)',
          }}
        >
          <SigSparkle size={23} />
        </span>
        <span style={{ ...labelStyle, color: 'var(--text-3)' }}>Surprise</span>
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
        // qui réserve déjà la hauteur de la barre) — le bouton central Surprise
        // ne doit jamais être recouvert. Sous les overlays plein écran (≥1300).
        zIndex: 950,
        paddingBottom: 'var(--safe-bottom)',
        boxShadow: 'var(--s2)',
      }}
    >
      {LEFT_TABS.map((tab) => (
        <TabLink key={tab.label} tab={tab} active={tab.match(pathname)} badge={badgeFor(tab)} />
      ))}
      <SurpriseButton />
      {RIGHT_TABS.map((tab) => (
        <TabLink key={tab.label} tab={tab} active={tab.match(pathname)} badge={badgeFor(tab)} />
      ))}
    </nav>
  )
}
