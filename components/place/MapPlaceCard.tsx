'use client'
// MapPlaceCard — carte resto flottante (app native) affichée à la sélection sur la carte.
// Reproduit la maquette Stitch « Carte Interactive » : photo + note + badges + « Voir la fiche » + ❤️.
import { memo, useState } from 'react'
import type { PlaceCard } from '@/types'
import { Star, Bookmark, X, Send } from 'lucide-react'
import { frCuisine } from '@/lib/cuisine'
import { useIsNative } from '@/lib/native/platform'
import SendToFriendSheet from '@/components/social/SendToFriendSheet'
import PlaceThumb from '@/components/place/PlaceThumb'

interface Props {
  place: PlaceCard
  onOpen: () => void
  onClose: () => void
  onToggleFavorite: () => void
}

// Best photo URL — used for the "send to friend" share payload.
function photoUrl(place: PlaceCard, size: number): string | null {
  const p = place.fsq?.photos?.[0]
  if (p) return `${p.prefix}${size}x${size}${p.suffix}`
  return place.wikidata?.image_url ?? null
}

function priceLabel(price?: number): string {
  return price == null ? '' : '€'.repeat(price)
}

const MapPlaceCard = memo(function MapPlaceCard({
  place,
  onOpen,
  onClose,
  onToggleFavorite,
}: Props) {
  const native = useIsNative()
  const [sharing, setSharing] = useState(false)
  const cuisine = place.cuisine ?? place.fsq?.categories?.[0]?.name
  const zone = place.osm_enriched?.district ?? place.osm_enriched?.city
  const rating = place.fsq?.rating
  const price = place.fsq?.price
  const michelin = place.wikidata?.michelin_stars ?? place.osm_enriched?.michelin
  const isFav = !!place.is_favorite
  const badge = michelin
    ? 'Étoilé Michelin'
    : rating != null && rating >= 9
      ? 'Exceptionnel'
      : rating != null && rating >= 8
        ? 'Top choix'
        : null

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(56px + var(--safe-bottom) + 12px)',
        zIndex: 950,
        background: 'var(--bg)',
        WebkitBackdropFilter: 'blur(18px)',
        backdropFilter: 'blur(18px)',
        border: '1px solid var(--border)',
        borderRadius: 26,
        boxShadow: 'var(--s4)',
        padding: 12,
        display: 'flex',
        gap: 14,
        animation: 'slideUp 240ms cubic-bezier(0.16,1,0.3,1) backwards',
      }}
    >
      {/* Photo */}
      <button
        onClick={onOpen}
        aria-label={`Ouvrir ${place.name}`}
        style={{
          width: 104,
          height: 104,
          flexShrink: 0,
          borderRadius: 18,
          overflow: 'hidden',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          background: 'var(--surface-2)',
        }}
      >
        <PlaceThumb place={place} initialSize={44} />
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <button
            onClick={onOpen}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: 'left',
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {place.name}
          </button>
          {rating != null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                flexShrink: 0,
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              <Star size={14} strokeWidth={0} fill="var(--star)" />
              {rating.toFixed(1)}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              flexShrink: 0,
              width: 24,
              height: 24,
              marginTop: -2,
              borderRadius: 999,
              border: 'none',
              background: 'var(--surface-2)',
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={14} strokeWidth={2.25} />
          </button>
        </div>

        <p
          style={{
            margin: '2px 0 0',
            fontSize: 13,
            color: 'var(--text-2)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {[cuisine ? frCuisine(cuisine) : null, zone].filter(Boolean).join(' • ')}
        </p>

        <div style={{ display: 'flex', gap: 6, marginTop: 6, marginBottom: 8 }}>
          {badge && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-2)',
                background: 'var(--surface-2)',
                borderRadius: 999,
                padding: '3px 9px',
              }}
            >
              {badge}
            </span>
          )}
          {price != null && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-2)',
                background: 'var(--surface-2)',
                borderRadius: 999,
                padding: '3px 9px',
              }}
            >
              {priceLabel(price)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button
            onClick={onOpen}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 13,
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Voir la fiche
          </button>
          {native && (
            <button
              onClick={() => setSharing(true)}
              aria-label="Envoyer à un ami"
              style={{
                width: 42,
                height: 42,
                flexShrink: 0,
                borderRadius: 13,
                border: 'none',
                background: 'var(--surface-2)',
                color: 'var(--text-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Send size={18} strokeWidth={1.9} />
            </button>
          )}
          <button
            onClick={onToggleFavorite}
            aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: 13,
              border: 'none',
              background: 'var(--surface-2)',
              color: isFav ? 'var(--accent)' : 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bookmark size={19} strokeWidth={1.9} fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
      {sharing && (
        <SendToFriendSheet
          place={{
            osm_id: place.osm_id,
            name: place.name,
            cuisine: cuisine ?? null,
            lat: place.lat,
            lon: place.lon,
            photo: photoUrl(place, 400),
          }}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  )
})

export default MapPlaceCard
