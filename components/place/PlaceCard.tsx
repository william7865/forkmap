'use client'
import { memo, useState, useCallback, useEffect, Fragment, type ReactNode } from 'react'
import { getNote } from '@/components/place/NoteModal'
import type { PlaceCard as T } from '@/types'
import { Bookmark, MapPin, Star } from 'lucide-react'
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

export const ITEM_HEIGHT = 92
// Native "library" list-line — flat, calm, 66px thumb. Web keeps ITEM_HEIGHT.
export const ITEM_HEIGHT_NATIVE = 90

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

  // ─────────────────── NATIVE — ligne « bibliothèque » ──
  // Plate et calme : vignette 66px + nom serif + méta à points, comme l'écran
  // Favoris. Fini la carte bordée/ombrée photo-forward.
  if (native) {
    const michelin = place.wikidata?.michelin_stars ?? place.osm_enriched?.michelin
    const meta: ReactNode[] = []
    if (rating != null) {
      meta.push(
        <span
          key="rating"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontWeight: 700,
            color: 'var(--text)',
          }}
        >
          <Star size={13} strokeWidth={0} fill="var(--star)" />
          {rating.toFixed(1)}
        </span>
      )
    }
    if (cuisine) meta.push(<span key="cuisine">{frCuisine(cuisine)}</span>)
    if (price != null) {
      meta.push(
        <span key="price" style={{ color: 'var(--text-3)', fontWeight: 600 }}>
          {priceLabel(price)}
        </span>
      )
    }
    if (place.open_now !== undefined) {
      meta.push(
        <span
          key="open"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontWeight: 600,
            color: place.open_now ? 'var(--open)' : 'var(--closed)',
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
          {place.open_now ? 'Ouvert' : 'Fermé'}
        </span>
      )
    }
    if (place.distance != null) {
      meta.push(
        <span key="dist" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <MapPin size={12} strokeWidth={1.75} />
          {formatWalkTime(place.distance)}
        </span>
      )
    }
    if (hasNote) {
      meta.push(
        <span
          key="note"
          title="Note personnelle"
          style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}
        />
      )
    }

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Voir ${place.name}`}
        style={{
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          padding: '0 16px',
          background: isSelected ? 'var(--surface)' : 'transparent',
          cursor: 'pointer',
          transform: pressing ? 'scale(0.99)' : 'scale(1)',
          transition: 'background 160ms ease, transform 160ms ease',
          outline: 'none',
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
        {/* Vignette 66px — photo ou repli dégradé + initiale serif */}
        <div
          style={{
            position: 'relative',
            width: 66,
            height: 66,
            borderRadius: 15,
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: 'var(--s1)',
            border: isSelected ? '2px solid var(--accent)' : 'none',
          }}
        >
          <PlaceThumb place={place} initialSize={28} />
          {place.friendsSaved && place.friendsSaved.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: 4,
                left: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                background: 'rgba(255,255,255,0.94)',
                backdropFilter: 'blur(4px)',
                borderRadius: 999,
                padding: '2px 6px 2px 3px',
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
                    <Avatar name={f.display_name} src={f.avatar_url} id={f.id} size={14} />
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text)' }}>
                {place.friendsSaved.length}
              </span>
            </div>
          )}
        </div>

        {/* Corps — nom serif + méta à points */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {michelin && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
                marginBottom: 3,
              }}
            >
              <Star size={10} strokeWidth={0} fill="var(--star)" />
              Étoilé Michelin
            </span>
          )}
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
                  {i > 0 && (
                    <span
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: 'var(--text-4)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {m}
                </Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Favori */}
        <button
          onClick={handleFavClick}
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

  // ─────────────────────────────────────────── WEB — inchangé ──
  const cardBorder = isSelected ? '1px solid var(--border-strong)' : '1px solid var(--border)'
  const cardShadow = isSelected ? 'var(--s2)' : isHovered ? 'var(--s2)' : 'var(--s0)'
  const cardBg = isSelected ? 'var(--surface)' : 'var(--bg)'
  const cardTransform = pressing ? 'scale(0.985)' : isHovered ? 'translateY(-1px)' : 'none'

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
        transition:
          'box-shadow 140ms var(--ease-out), transform 140ms var(--ease-out), background 140ms var(--ease-out)',
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
      {/* Thumb — photo si dispo, sinon initiale serif sur dégradé */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--surface)',
        }}
      >
        <PlaceThumb place={place} initialSize={22} photoSize={128} tone="light" />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16.5,
              fontWeight: 500,
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
