'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bookmark, User, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import MapGlyph from '@/components/icons/MapGlyph'
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
    icon: (active) => (
      <Bookmark
        size={25}
        strokeWidth={active ? 1.4 : 1.8}
        fill={active ? 'currentColor' : 'none'}
      />
    ),
    label: 'Carnet',
    match: (p) => p === '/' || p.startsWith('/favorites'),
    badge: 'imports',
  },
  {
    href: '/carte',
    icon: (active) => <MapGlyph active={active} />,
    label: 'Carte',
    match: (p) => p.startsWith('/carte'),
  },
  {
    // Le deck vit à `/carte?surprise=1` : MapHome charge les restaurants et
    // SurpriseParamWatcher ouvre le concierge. Un écran /surprise autonome
    // devrait refaire toute cette chaîne (géoloc → bbox → fetch) pour le même
    // résultat. Il est plein écran une fois ouvert, donc il se lit bien comme
    // une destination.
    href: '/carte?surprise=1',
    // L'étincelle de marque (SigSparkle) est une forme PLEINE ; entourée de
    // trois icônes en trait, elle pesait beaucoup plus lourd et se lisait
    // comme l'onglet sélectionné même inactive. Ici on prend la version en
    // trait pour que les quatre icônes parlent la même langue — SigSparkle
    // reste la signature de la marque partout ailleurs.
    icon: (active) => (
      <Sparkles
        size={25}
        strokeWidth={active ? 1.4 : 1.8}
        fill={active ? 'currentColor' : 'none'}
      />
    ),
    label: 'Surprends-moi',
    // Jamais « actif » : `?surprise=1` est nettoyé par SurpriseParamWatcher dès
    // l'ouverture, et le deck (z-index 1000) recouvre la barre (950) tant qu'il
    // est ouvert. Un état actif ici ne serait jamais visible — une première
    // version le calculait via useSearchParams, ce qui imposait une frontière
    // Suspense et faisait échouer l'export statique, pour rien.
    match: () => false,
  },
  {
    href: '/account',
    icon: (active) => (
      <User size={25} strokeWidth={active ? 1.4 : 1.8} fill={active ? 'currentColor' : 'none'} />
    ),
    label: 'Profil',
    match: (p) => p.startsWith('/account'),
    badge: 'messages',
  },
]

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
      // Sans texte, le nom de l'onglet n'existe plus que pour les lecteurs
      // d'écran : aria-label n'est pas optionnel ici, c'est le seul libellé.
      aria-label={tab.label}
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
          // Pas de pastille de fond sur l'onglet actif : elle se lisait comme
          // un survol ou un appui, pas comme une sélection — et en icônes
          // seules elle prenait toute la place. La sélection passe par la
          // couleur et par le REMPLISSAGE de l'icône, comme chez Instagram et
          // X : un trait simplement plus épais ne se voit pas à la vitesse
          // d'un coup d'œil.
          //
          // Le padding est aussi devenu UNIFORME : il valait 16px sur l'actif
          // et 14px ailleurs, donc l'icône se décalait d'un onglet à l'autre.
          padding: '10px 14px',
          // --text-3 et pas --text-4 : ce dernier tombe à ~2,3:1 sur blanc,
          // sous le seuil de 3:1 des éléments non textuels. L'écart avec
          // l'actif se joue sur l'épaisseur du trait, pas sur la pâleur.
          color: active ? 'var(--accent)' : 'var(--text-3)',
          transition: 'color 160ms ease',
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
