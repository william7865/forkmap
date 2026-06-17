// ============================================================
// components/states/EmptyState.tsx — reusable empty state
// Variants: no-results, no-favorites, no-location, no-area
// ============================================================
'use client'

import { Search, UtensilsCrossed, MapPin, Radio } from 'lucide-react'

interface Props {
  variant: 'no-results' | 'no-favorites' | 'no-area' | 'no-location'
  searchQuery?: string
  onReset?: () => void
  onExplore?: () => void
}

const CONFIG = {
  'no-results': {
    Icon: Search,
    title: 'Aucun résultat',
    desc: (q?: string) =>
      q
        ? `Aucun restaurant ne correspond à "${q}"`
        : 'Aucun restaurant ne correspond à vos filtres',
    cta: 'Réinitialiser les filtres',
  },
  'no-favorites': {
    Icon: UtensilsCrossed,
    title: "Rien d'enregistré",
    desc: () => "Appuyez sur le marque-page d'un restaurant pour l'enregistrer ici",
    cta: 'Explorer la carte',
  },
  'no-area': {
    Icon: MapPin,
    title: 'Aucun restaurant ici',
    desc: () => 'Déplacez la carte pour explorer une nouvelle zone',
    cta: null,
  },
  'no-location': {
    Icon: Radio,
    title: 'Position non définie',
    desc: () => 'Définissez un point de départ pour voir les distances et itinéraires',
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
            background: 'rgba(187,94,46,0.15)',
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
            e.currentTarget.style.background = 'rgba(187,94,46,0.15)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
        >
          {c.cta}
        </button>
      )}
    </div>
  )
}
