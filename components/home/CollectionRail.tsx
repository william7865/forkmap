'use client'
// CollectionRail — a horizontal, snap-scrolling rail of place thumbnails for
// the native editorial home. Extracted from HomeEditorial's single rail so the
// home can render several themed collections (see lib/collections.ts).
import { memo } from 'react'
import { Star, Sparkles, Clock, Footprints, Utensils } from 'lucide-react'
import type { PlaceCard } from '@/types'
import type { CollectionIcon } from '@/lib/collections'
import { frCuisine } from '@/lib/cuisine'
import PlaceThumb from '@/components/place/PlaceThumb'

const ICONS: Record<CollectionIcon, React.ElementType> = {
  sparkles: Sparkles,
  star: Star,
  clock: Clock,
  walk: Footprints,
  utensils: Utensils,
}

interface Props {
  title: string
  icon?: CollectionIcon
  places: PlaceCard[]
  onSelect: (p: PlaceCard) => void
}

const CollectionRail = memo(function CollectionRail({ title, icon, places, onSelect }: Props) {
  if (places.length === 0) return null
  const Icon = icon ? ICONS[icon] : null

  return (
    <div style={{ marginTop: 26 }}>
      {/* Eyebrow header (matches HomeEditorial's Eyebrow) */}
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
          {Icon && <Icon size={12} strokeWidth={2} style={{ color: 'var(--star)' }} />}
          {title}
        </span>
        <span style={{ height: 1, background: 'var(--border)', flex: 1 }} />
      </div>

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
        {places.map((p) => {
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
                style={{ height: 96, borderRadius: 16, overflow: 'hidden', position: 'relative' }}
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
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
  )
})

export default CollectionRail
