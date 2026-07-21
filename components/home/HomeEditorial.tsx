'use client'
// HomeEditorial — en-tête « bibliothèque » du bottom sheet natif :
// un eyebrow contextuel (« Ce soir près de toi », « Ouvert maintenant »…) suivi
// d'une sélection de lieux en lignes-liste calmes (vignette 66px + nom serif +
// méta à points), comme les écrans Favoris / Fiche. Rendu uniquement en natif,
// hors mode « enregistrés », quand il y a des lieux.
import { memo, useEffect, useMemo, useState, Fragment, type ReactNode } from 'react'
import type { PlaceCard } from '@/types'
import { Bookmark, MapPin, Sparkles } from 'lucide-react'
import { frCuisine } from '@/lib/cuisine'
import { getMoment, momentEyebrow } from '@/lib/context'
import { loadTasteProfile, tasteBoost, emptyProfile } from '@/lib/taste'
import { buildCollections } from '@/lib/collections'
import { staggerDelay } from '@/lib/motion'
import PlaceRowThumb from '@/components/place/PlaceRowThumb'

interface Props {
  places: PlaceCard[]
  onSelect: (p: PlaceCard) => void
  onToggleFavorite: (p: PlaceCard) => void
  /** Request real photos for the exact cards rendered here (the picks) that
   *  still lack one — the score-capped fetch misses editorial picks. */
  onNeedPhotos?: (places: PlaceCard[]) => void
}

/** Combien de lieux dans la sélection éditoriale au-dessus de « Tous les restaurants ». */
const PICK_COUNT = 5

function walkTime(m?: number): string | null {
  if (m == null) return null
  const mins = Math.round(m / 80)
  return mins < 1 ? 'À côté' : `${mins} min`
}

function priceLabel(price?: number): string {
  if (price == null) return ''
  return '€'.repeat(price)
}

const MetaSep = () => (
  <span
    style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-4)', flexShrink: 0 }}
  />
)

// Ligne-liste éditoriale — même langage visuel que la liste principale (PlaceCard
// natif) : vignette 66px, nom serif, méta à points.
function PickRow({
  place,
  onSelect,
  onToggleFavorite,
  index,
}: {
  place: PlaceCard
  onSelect: (p: PlaceCard) => void
  onToggleFavorite: (p: PlaceCard) => void
  index: number
}) {
  const cuisine = place.cuisine ?? place.fsq?.categories?.[0]?.name
  const price = place.fsq?.price
  const isFav = !!place.is_favorite
  const wt = walkTime(place.distance)

  // Méta secondaire : la note se pose sur la photo (voir plus bas), elle n'est
  // plus un item parmi cinq où tout avait le même poids.
  const meta: ReactNode[] = []
  if (cuisine) meta.push(<span key="cuisine">{frCuisine(cuisine)}</span>)
  if (price != null) {
    meta.push(
      <span key="price" style={{ color: 'var(--text-3)', fontWeight: 600 }}>
        {priceLabel(price)}
      </span>
    )
  }
  if (wt) {
    meta.push(
      <span key="dist" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <MapPin size={12} strokeWidth={1.75} />
        {wt}
      </span>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Voir ${place.name}`}
      onClick={() => onSelect(place)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(place)
        }
      }}
      className="anim-fade-up tap-press"
      style={{
        animationDelay: staggerDelay(index),
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '9px 16px',
        cursor: 'pointer',
        outline: 'none',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      {/* Tuile photo partagée avec la liste principale (PlaceRowThumb). Pas de
          badge amis ici : la sélection éditoriale reste calme. */}
      <PlaceRowThumb place={place} />

      {/* Corps — nom serif + méta à points */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 16.5,
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {place.name}
        </p>
        {meta.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 5,
              fontSize: 12.5,
              color: 'var(--text-2)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {meta.map((m, i) => (
              <Fragment key={i}>
                {i > 0 && <MetaSep />}
                {m}
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Favori */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(place)
        }}
        aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        style={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: 999,
          border: 'none',
          background: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isFav ? 'var(--accent)' : 'var(--text-3)',
        }}
      >
        <Bookmark size={19} strokeWidth={1.9} fill={isFav ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

const HomeEditorial = memo(function HomeEditorial({
  places,
  onSelect,
  onToggleFavorite,
  onNeedPhotos,
}: Props) {
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

  // Editorial picks = a genuine gem near you first, then the best of the themed
  // collections, deduped. Rank by rating (Michelin > rating); when no rating is
  // known, push fast-food/chains down so the top pick is never a burger joint,
  // then prefer open-now, then proximity. A small taste nudge (from the deck)
  // leans the selection to your taste.
  const picks = useMemo(() => {
    if (places.length === 0) return []
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
    const collections = buildCollections(places, taste, hero.osm_id)
    const ordered = [hero, ...collections.flatMap((c) => c.places)]
    const seen = new Set<string>()
    const unique: PlaceCard[] = []
    for (const p of ordered) {
      if (seen.has(p.osm_id)) continue
      seen.add(p.osm_id)
      unique.push(p)
      if (unique.length >= PICK_COUNT) break
    }
    return unique
  }, [places, taste])

  // Request real photos for the exact cards we render that still lack one — the
  // score-capped fetch misses editorial picks. Keyed on the set of no-photo ids
  // so it re-fires only when that set changes; the hook dedups by osm_id, so
  // extra calls are cheap no-ops.
  const missingPhotoIds = picks
    .filter((p) => !p.fsq?.photos?.length)
    .map((p) => p.osm_id)
    .join(',')
  useEffect(() => {
    if (!onNeedPhotos || picks.length === 0 || !missingPhotoIds) return
    onNeedPhotos(picks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingPhotoIds])

  if (picks.length === 0) return null

  return (
    <div style={{ margin: '4px 0 10px' }}>
      {/* Eyebrow contextuel + filet, */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px',
          margin: '2px 0 6px',
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
          <Sparkles size={12} strokeWidth={2} style={{ color: 'var(--star)' }} />
          {eyebrow}
        </span>
        <span style={{ height: 1, background: 'var(--border)', flex: 1 }} />
      </div>

      {/* Sélection en lignes-liste */}
      {picks.map((p, i) => (
        <PickRow
          key={p.osm_id}
          place={p}
          index={i}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  )
})

export default HomeEditorial
