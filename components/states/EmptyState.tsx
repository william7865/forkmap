// ============================================================
// components/states/EmptyState.tsx — reusable empty state
//
// Every variant names the GESTURE that fills it. An empty screen is the one
// moment a user is guaranteed to be looking for what to do next, so "Aucun
// favori ici." is a dead end where one sentence would have taught the app.
// ============================================================
'use client'

import {
  Search,
  UtensilsCrossed,
  MapPin,
  Radio,
  Utensils,
  PartyPopper,
  ListPlus,
} from 'lucide-react'

export type EmptyVariant =
  | 'no-results'
  | 'no-favorites'
  | 'no-area'
  | 'no-location'
  | 'no-visits'
  | 'no-tested'
  | 'all-tested'
  | 'no-lists'

interface Props {
  variant: EmptyVariant
  searchQuery?: string
  onReset?: () => void
  onExplore?: () => void
}

const CONFIG: Record<
  EmptyVariant,
  { Icon: typeof Search; title: string; desc: (q?: string) => string; cta: string | null }
> = {
  'no-results': {
    Icon: Search,
    title: 'Aucun résultat',
    desc: (q?: string) =>
      q
        ? `Aucun restaurant ne correspond à « ${q} »`
        : 'Aucun restaurant ne correspond à tes filtres',
    cta: 'Réinitialiser les filtres',
  },
  'no-favorites': {
    Icon: UtensilsCrossed,
    title: "Rien d'enregistré",
    desc: () => "Appuie sur le marque-page d'un restaurant pour le retrouver ici",
    cta: 'Explorer la carte',
  },
  'no-area': {
    Icon: MapPin,
    title: 'Aucun restaurant ici',
    desc: () => 'Déplace la carte pour explorer une nouvelle zone',
    cta: null,
  },
  'no-location': {
    Icon: Radio,
    title: 'Position non définie',
    desc: () => 'Définis un point de départ pour voir les distances et les itinéraires',
    cta: null,
  },
  'no-visits': {
    Icon: Utensils,
    title: 'Aucune visite',
    desc: () => "Ouvre la fiche d'un restaurant et consigne ta visite pour suivre tes dépenses ici",
    cta: 'Explorer la carte',
  },
  'no-tested': {
    Icon: Utensils,
    title: 'Rien de testé',
    desc: () => "Consigne une visite depuis la fiche d'un resto pour le marquer comme testé",
    cta: null,
  },
  'all-tested': {
    Icon: PartyPopper,
    title: 'Tout est testé',
    desc: () => "Tu as visité tous tes favoris. Enregistres-en d'autres pour continuer",
    cta: 'Explorer la carte',
  },
  'no-lists': {
    Icon: ListPlus,
    title: 'Aucune liste',
    desc: () => 'Crée une liste pour ranger tes favoris par envie, quartier ou occasion',
    cta: null,
  },
}

export default function EmptyState({ variant, searchQuery, onReset, onExplore }: Props) {
  const c = CONFIG[variant]
  const hasCta = c.cta && (onReset || onExplore)
  const ctaFn = onReset ?? onExplore
  const { Icon } = c

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-3)',
        }}
      >
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div>
        <p
          style={{
            margin: '0 0 5px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
          }}
        >
          {c.title}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>
          {c.desc(searchQuery)}
        </p>
      </div>
      {hasCta && ctaFn && (
        <button
          onClick={ctaFn}
          style={{
            padding: '8px 18px',
            borderRadius: 999,
            border: '1.5px solid var(--accent)',
            background: 'rgba(25,28,29,0.15)',
            color: 'var(--accent)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 120ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(25,28,29,0.15)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
        >
          {c.cta}
        </button>
      )}
    </div>
  )
}
