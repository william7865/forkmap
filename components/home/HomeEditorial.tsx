'use client'
// HomeEditorial — en-tête éditorial du bottom sheet natif : un hero
// « Ce soir près de toi » + un rail « Coups de cœur du quartier ». Donne une
// accroche à l'accueil au lieu d'une simple liste. Rendu uniquement en natif,
// hors mode « enregistrés », quand il y a des lieux.
import { memo, useEffect, useState } from 'react'
import type { PlaceCard } from '@/types'
import { Star, Bookmark, MapPin, Sparkles } from 'lucide-react'
import { frCuisine } from '@/lib/cuisine'
import { getMoment, momentEyebrow } from '@/lib/context'
import { loadTasteProfile, tasteBoost, isMadeForYou, emptyProfile } from '@/lib/taste'
import PlaceThumb from '@/components/place/PlaceThumb'

interface Props {
  places: PlaceCard[]
  onSelect: (p: PlaceCard) => void
  onToggleFavorite: (p: PlaceCard) => void
}

function walkTime(m?: number): string | null {
  if (m == null) return null
  const mins = Math.round(m / 80)
  return mins < 1 ? 'À côté' : `${mins} min`
}

function badgeFor(p: PlaceCard): string | null {
  const michelin = p.wikidata?.michelin_stars ?? p.osm_enriched?.michelin
  if (michelin) return 'Étoilé Michelin'
  const r = p.fsq?.rating
  if (r != null && r >= 9) return 'Exceptionnel'
  if (r != null && r >= 8) return 'Top choix'
  return null
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 4px',
        margin: '2px 0 10px',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10.5,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: 'var(--text-2)',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </span>
      <span style={{ height: 1, background: 'var(--border)', flex: 1 }} />
    </div>
  )
}

const HomeEditorial = memo(function HomeEditorial({ places, onSelect, onToggleFavorite }: Props) {
  // Contextual eyebrow ("Pour la pause déj", "Ce soir près de toi", "Ouvert
  // maintenant"…) — computed client-side so the static bundle doesn't hydrate
  // with the build-time clock.
  const [eyebrow, setEyebrow] = useState('Près de toi')
  // Taste learned by the Surprise deck, reused here so the home reflects it.
  const [taste, setTaste] = useState(emptyProfile())
  useEffect(() => {
    setEyebrow(momentEyebrow(getMoment()))
    setTaste(loadTasteProfile())
  }, [])

  if (places.length === 0) return null

  // Hero = a genuine gem near you. Don't hard-filter by open_now (chains have
  // machine-readable hours while real gems often don't → an open-only filter
  // biases toward fast-food). Rank by rating (Michelin > rating); when no
  // rating is known, push fast-food/chains down so the hero is never a burger
  // joint, then prefer open-now, then proximity.
  // Rating + a small taste nudge (from the deck) so the hero leans to your taste.
  const rating = (p: PlaceCard) =>
    (p.wikidata?.michelin_stars ? 10 : 0) + (p.fsq?.rating ?? 0) + tasteBoost(taste, p)
  const isChainish = (p: PlaceCard) =>
    /fast_food|burger/i.test(`${p.cuisine ?? ''} ${p.fsq?.categories?.[0]?.name ?? ''}`)
  const heroRank = (a: PlaceCard, b: PlaceCard) => {
    if (rating(b) !== rating(a)) return rating(b) - rating(a)
    const chain = (p: PlaceCard) => (isChainish(p) ? 1 : 0)
    if (chain(a) !== chain(b)) return chain(a) - chain(b)
    const open = (p: PlaceCard) => (p.open_now === true ? 1 : 0)
    if (open(b) !== open(a)) return open(b) - open(a)
    return (a.distance ?? Infinity) - (b.distance ?? Infinity)
  }
  const hero = [...places].sort(heroRank)[0] ?? places[0]
  const rail = places.filter((p) => p.osm_id !== hero.osm_id).slice(0, 8)
  const baseBadge = badgeFor(hero)
  // "Fait pour toi" when the hero matches your taste (Michelin still wins).
  const heroBadge =
    baseBadge === 'Étoilé Michelin'
      ? baseBadge
      : isMadeForYou(taste, hero)
        ? 'Fait pour toi'
        : baseBadge
  const heroWalk = walkTime(hero.distance)
  const heroCuisine = hero.cuisine ?? hero.fsq?.categories?.[0]?.name

  return (
    <div style={{ margin: '4px 16px 20px' }}>
      <Eyebrow>
        <Sparkles size={12} strokeWidth={2} style={{ color: 'var(--star)' }} />
        {eyebrow}
      </Eyebrow>

      {/* Hero */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Voir ${hero.name}`}
        onClick={() => onSelect(hero)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(hero)
          }
        }}
        style={{
          position: 'relative',
          height: 172,
          borderRadius: 22,
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: 'var(--s2)',
        }}
      >
        <PlaceThumb place={hero} initialSize={72} tone="dark" />
        {/* Legibility scrim */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(12,11,8,0.86) 0%, rgba(12,11,8,0.18) 46%, transparent 72%)',
          }}
        />
        {/* Bookmark */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(hero)
          }}
          aria-label={hero.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 36,
            height: 36,
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.24)',
            background: 'rgba(255,255,255,0.16)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
          }}
        >
          <Bookmark size={16} strokeWidth={2} fill={hero.is_favorite ? 'currentColor' : 'none'} />
        </button>
        {/* Content */}
        <div style={{ position: 'absolute', left: 18, right: 18, bottom: 18 }}>
          {heroBadge && (
            <span
              style={{
                display: 'inline-block',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: '#14140f',
                background: 'var(--star)',
                padding: '3px 8px',
                borderRadius: 4,
                marginBottom: 9,
              }}
            >
              {heroBadge}
            </span>
          )}
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 25,
              fontWeight: 600,
              color: '#fff',
              lineHeight: 1.06,
              letterSpacing: '-0.01em',
              textShadow: '0 1px 12px rgba(0,0,0,0.3)',
            }}
          >
            {hero.name}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            {hero.fsq?.rating != null && (
              <span
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}
              >
                <Star size={13} strokeWidth={0} fill="var(--star)" />
                {hero.fsq.rating.toFixed(1)}
              </span>
            )}
            {heroCuisine && <span style={{ opacity: 0.85 }}>{frCuisine(heroCuisine)}</span>}
            {hero.open_now === true && (
              <span style={{ color: '#7fe0a8', fontWeight: 600 }}>
                Ouvert{heroWalk ? ` · ${heroWalk}` : ''}
              </span>
            )}
            {hero.open_now !== true && heroWalk && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, opacity: 0.85 }}>
                <MapPin size={12} strokeWidth={1.75} />
                {heroWalk}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Collection rail */}
      {rail.length >= 2 && (
        <div style={{ marginTop: 26 }}>
          <Eyebrow>Coups de cœur du quartier</Eyebrow>
          <div
            className="no-scrollbar"
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              padding: '2px 4px 4px',
              scrollSnapType: 'x proximity',
            }}
          >
            {rail.map((p) => {
              const c = p.cuisine ?? p.fsq?.categories?.[0]?.name
              return (
                <button
                  key={p.osm_id}
                  onClick={() => onSelect(p)}
                  style={{
                    flex: '0 0 132px',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    textAlign: 'left',
                    cursor: 'pointer',
                    scrollSnapAlign: 'start',
                  }}
                >
                  <div
                    style={{
                      height: 96,
                      borderRadius: 16,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <PlaceThumb place={p} initialSize={38} />
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--text)',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.12,
                      marginTop: 8,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: 2,
                      fontSize: 11.5,
                      color: 'var(--text-2)',
                    }}
                  >
                    {p.fsq?.rating != null && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2,
                          fontWeight: 700,
                          color: 'var(--text)',
                        }}
                      >
                        <Star size={11} strokeWidth={0} fill="var(--star)" />
                        {p.fsq.rating.toFixed(1)}
                      </span>
                    )}
                    {c && (
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {frCuisine(c)}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})

export default HomeEditorial
