'use client'
import { memo, useState, useCallback, useEffect } from 'react'
import { getNote } from '@/components/place/NoteModal'
import type { PlaceCard as T } from '@/types'
import { Bookmark, MapPin, Utensils, Star } from 'lucide-react'
import { frCuisine } from '@/lib/cuisine'
import { useIsNative } from '@/lib/native/platform'
import PlaceThumb from '@/components/place/PlaceThumb'
import { Avatar } from '@/components/social/Avatar'

interface Props {
  place: T
  isSelected: boolean
  isHovered: boolean
  index: number
  onHover: () => void
  onLeave: () => void
  onClick: () => void
  onToggleFavorite: () => void
  onShare?: () => void
}

function formatWalkTime(metres?: number): string {
  if (metres == null) return ''
  const mins = Math.round(metres / 80)
  if (mins < 1) return 'À côté'
  return `${mins} min`
}

function priceLabel(price?: number): string {
  if (price == null) return ''
  return '€'.repeat(price)
}

// Short editorial eyebrow badge (native)
function badgeFor(place: T, rating?: number): { label: string; michelin: boolean } | null {
  const michelin = place.wikidata?.michelin_stars ?? place.osm_enriched?.michelin
  if (michelin) return { label: 'Étoilé Michelin', michelin: true }
  if (rating != null && rating >= 9) return { label: 'Exceptionnel', michelin: false }
  if (rating != null && rating >= 8) return { label: 'Top choix', michelin: false }
  return null
}

// Neighbourhood/zone line (native)
function zoneFor(place: T): string | null {
  return place.osm_enriched?.district ?? place.osm_enriched?.city ?? null
}

export const ITEM_HEIGHT = 92
// Native editorial card is taller (photo-forward) + airier. Web keeps ITEM_HEIGHT.
export const ITEM_HEIGHT_NATIVE = 134

const PlaceCard = memo(function PlaceCard({
  place,
  isSelected,
  isHovered,
  index: _index,
  onHover,
  onLeave,
  onClick,
  onToggleFavorite,
}: Props) {
  const native = useIsNative()
  const [pressing, setPressing] = useState(false)
  const [hasNote, setHasNote] = useState(false)
  useEffect(() => {
    setHasNote(!!getNote(place.osm_id))
  }, [place.osm_id])

  const cuisine = place.cuisine ?? place.fsq?.categories?.[0]?.name
  const rating = place.fsq?.rating
  const price = place.fsq?.price
  const isFav = !!place.is_favorite

  const handleClick = useCallback(() => {
    setPressing(true)
    setTimeout(() => setPressing(false), 160)
    onClick()
  }, [onClick])

  const handleFavClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleFavorite()
    },
    [onToggleFavorite]
  )

  // ─────────────────────────── NATIVE — carte éditoriale photo-forward ──
  if (native) {
    const badge = badgeFor(place, rating)
    const zone = zoneFor(place)
    const cardShadow = isSelected ? 'var(--s3)' : 'var(--s2)'

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Voir ${place.name}`}
        style={{
          height: ITEM_HEIGHT_NATIVE - 14,
          boxSizing: 'border-box',
          margin: '0 16px',
          borderRadius: 22,
          overflow: 'hidden',
          position: 'relative',
          background: 'var(--bg)',
          border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
          boxShadow: cardShadow,
          cursor: 'pointer',
          transform: pressing ? 'scale(0.985)' : 'scale(1)',
          transition: 'box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          padding: 12,
          gap: 15,
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        {/* Photo (or editorial fallback tile) */}
        <div
          style={{
            width: 94,
            height: 94,
            borderRadius: 16,
            overflow: 'hidden',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <PlaceThumb place={place} initialSize={40} />
          {place.friendsSaved && place.friendsSaved.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: 5,
                left: 5,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(255,255,255,0.94)',
                backdropFilter: 'blur(4px)',
                borderRadius: 999,
                padding: '2px 7px 2px 3px',
                boxShadow: 'var(--s1)',
              }}
            >
              <div style={{ display: 'flex' }}>
                {place.friendsSaved.slice(0, 2).map((f, i) => (
                  <div
                    key={f.id}
                    style={{
                      marginLeft: i === 0 ? 0 : -6,
                      boxShadow: '0 0 0 1.5px #fff',
                      borderRadius: '50%',
                    }}
                  >
                    <Avatar name={f.display_name} src={f.avatar_url} id={f.id} size={16} />
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text)' }}>
                {place.friendsSaved.length}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingRight: 34,
            gap: 5,
          }}
        >
          {/* Badge reserved for Michelin only — keeps the list clean; a badge
              on every high-rated card cheapens it. Rating carries the quality. */}
          {badge?.michelin && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text)',
                lineHeight: 1,
              }}
            >
              <Star size={10} strokeWidth={0} fill="var(--star)" />
              {badge.label}
            </span>
          )}

          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
            }}
          >
            {place.name}
          </span>

          {(cuisine || zone) && (
            <span
              style={{
                fontSize: 12.5,
                color: 'var(--text-2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {[cuisine ? frCuisine(cuisine) : null, zone].filter(Boolean).join(' · ')}
            </span>
          )}

          {/* Bottom meta: gold star rating · price · open state */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 1,
              fontSize: 12.5,
              color: 'var(--text-2)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {rating != null && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontWeight: 700,
                  color: 'var(--text)',
                  flexShrink: 0,
                }}
              >
                <Star size={13} strokeWidth={0} fill="var(--star)" />
                {rating.toFixed(1)}
              </span>
            )}
            {price != null && (
              <span style={{ flexShrink: 0, color: 'var(--text-3)', fontWeight: 600 }}>
                {priceLabel(price)}
              </span>
            )}
            {place.distance != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                <MapPin size={12} strokeWidth={1.75} />
                {formatWalkTime(place.distance)}
              </span>
            )}
            {place.open_now !== undefined && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  color: place.open_now ? 'var(--open)' : 'var(--closed)',
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: place.open_now ? 'var(--open)' : 'var(--closed)',
                  }}
                />
                {place.open_now ? 'Ouvert' : 'Fermé'}
              </span>
            )}
            {hasNote && (
              <span
                title="Note personnelle"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        </div>

        {/* Favorite button (top-right) */}
        <button
          onClick={handleFavClick}
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
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

  // ─────────────────────────────────────────── WEB — inchangé ──
  const cardBorder = isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)'
  const cardShadow = isSelected ? 'var(--s2)' : isHovered ? 'var(--s1)' : 'none'
  const cardBg = isSelected ? 'var(--accent-light)' : 'var(--bg)'
  const cardTransform = pressing ? 'scale(0.985)' : 'scale(1)'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Voir ${place.name}`}
      style={{
        height: ITEM_HEIGHT,
        boxSizing: 'border-box',
        margin: '0 12px 8px',
        borderRadius: 12,
        overflow: 'hidden',
        background: cardBg,
        border: cardBorder,
        boxShadow: cardShadow,
        cursor: 'pointer',
        transform: cardTransform,
        transition: 'box-shadow 150ms ease, transform 150ms ease, background 150ms ease',
        outline: 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 12,
        textAlign: 'left',
        fontFamily: 'inherit',
        // pas de width:100% : avec les marges horizontales (0 12px) ça
        // débordait de 24px à droite (carte rognée). Le bloc flex remplit
        // déjà la largeur dispo moins les marges.
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      {/* Icon square */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: isSelected ? 'var(--accent)' : 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: isSelected ? 'var(--on-accent)' : 'var(--text-3)',
          transition: 'background 150ms ease, color 150ms ease',
        }}
      >
        <Utensils size={18} strokeWidth={1.75} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 15.5,
              fontWeight: 600,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.25,
              flex: 1,
              minWidth: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {place.name}
          </span>
          {hasNote && (
            <span
              title="Note personnelle"
              style={{
                flexShrink: 0,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--accent)',
              }}
            />
          )}
          {/* Rating badge */}
          {rating != null && (
            <span
              style={{
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--ember-text)',
                background: 'var(--ember-light)',
                borderRadius: 6,
                padding: '1px 6px',
                letterSpacing: '-0.01em',
              }}
            >
              {rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--text-3)',
            flexWrap: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {cuisine && (
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 110,
              }}
            >
              {frCuisine(cuisine)}
            </span>
          )}
          {cuisine && (price != null || place.distance != null) && (
            <span style={{ color: 'var(--border-strong)', flexShrink: 0 }}>·</span>
          )}
          {price != null && (
            <span style={{ flexShrink: 0, color: 'var(--text-3)' }}>{priceLabel(price)}</span>
          )}
          {price != null && place.distance != null && (
            <span style={{ color: 'var(--border-strong)', flexShrink: 0 }}>·</span>
          )}
          {place.distance != null && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                flexShrink: 0,
              }}
            >
              <MapPin size={11} strokeWidth={1.75} />
              {formatWalkTime(place.distance)}
            </span>
          )}
          {place.open_now !== undefined && (
            <>
              <span style={{ color: 'var(--border-strong)', flexShrink: 0 }}>·</span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  color: place.open_now ? 'var(--open)' : 'var(--closed)',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: place.open_now ? 'var(--open)' : 'var(--closed)',
                    flexShrink: 0,
                  }}
                />
                {place.open_now ? 'Ouvert' : 'Fermé'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Favorite button */}
      <button
        onClick={handleFavClick}
        aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        style={{
          width: 36,
          height: 36,
          minWidth: 44,
          minHeight: 44,
          borderRadius: 8,
          border: 'none',
          background: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isFav ? 'var(--ember)' : 'var(--text-3)',
          flexShrink: 0,
          transition: 'color 140ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--ember)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = isFav ? 'var(--ember)' : 'var(--text-3)'
        }}
      >
        <Bookmark size={18} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
})

export default PlaceCard
