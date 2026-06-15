'use client'
import { memo, useState, useCallback, useEffect } from 'react'
import { getNote } from '@/components/place/NoteModal'
import type { PlaceCard as T } from '@/types'
import { Bookmark, MapPin, Utensils } from 'lucide-react'

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

export const ITEM_HEIGHT = 92

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

  const cardBorder = isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)'
  const cardShadow = isSelected ? 'var(--s2)' : isHovered ? 'var(--s1)' : 'none'
  const cardBg = isSelected ? 'var(--accent-light)' : 'var(--bg)'
  const cardTransform = pressing ? 'scale(0.985)' : 'scale(1)'

  return (
    <button
      type="button"
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
        width: '100%',
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
          color: isSelected ? 'white' : 'var(--text-3)',
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
              {cuisine.charAt(0).toUpperCase() + cuisine.slice(1).toLowerCase()}
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
    </button>
  )
})

export default PlaceCard
