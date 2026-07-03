// PlaceList — single-scroll virtualized list. An optional `header` (editorial
// hero, rail, concierge…) renders inside the SAME scroll container so the whole
// sheet scrolls as one feed — no nested/double scroll.
'use client'

import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import type { PlaceCard } from '@/types'
import PlaceCardItem, { ITEM_HEIGHT, ITEM_HEIGHT_NATIVE } from './PlaceCard'
import { useVirtualList } from '@/lib/hooks/useVirtualList'
import { useIsNative } from '@/lib/native/platform'
import EmptyState from '@/components/states/EmptyState'
import SkeletonList from '@/components/states/SkeletonList'
import ErrorState from '@/components/states/ErrorState'

interface Props {
  places: PlaceCard[]
  selectedId?: string
  hoveredId?: string | null
  onHover: (id: string | null) => void
  onSelect: (p: PlaceCard) => void
  onToggleFavorite: (p: PlaceCard) => void
  onShare?: (p: PlaceCard) => void
  /** Content rendered above the list, inside the same scroll container. */
  header?: ReactNode
  // State props
  loading?: boolean
  error?: string | null
  nameQuery?: string
  hasActiveFilters?: boolean
  onRetry?: () => void
  onResetFilters?: () => void
}

const PlaceList = memo(function PlaceList({
  places,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
  onToggleFavorite,
  onShare,
  header,
  loading,
  error,
  nameQuery,
  hasActiveFilters,
  onRetry,
  onResetFilters,
}: Props) {
  const native = useIsNative()
  const rowHeight = native ? ITEM_HEIGHT_NATIVE : ITEM_HEIGHT

  // Measure the header so virtualization can offset its window by its height.
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerH, setHeaderH] = useState(0)
  useEffect(() => {
    const el = headerRef.current
    if (!el) {
      setHeaderH(0)
      return
    }
    const ro = new ResizeObserver(([entry]) => setHeaderH(entry.contentRect.height))
    ro.observe(el)
    setHeaderH(el.getBoundingClientRect().height)
    return () => ro.disconnect()
  }, [header])

  const { containerRef, virtualItems, totalHeight } = useVirtualList(places, {
    itemHeight: rowHeight,
    overscan: 6,
    leadingOffset: headerH,
  })

  const empty = !loading && places.length === 0

  let body: ReactNode
  if (loading && places.length === 0) {
    body = <SkeletonList />
  } else if (error && places.length === 0) {
    body = (
      <ErrorState
        title="Impossible de charger les restaurants"
        message={
          error.includes('timeout')
            ? 'Le service de données cartographiques a expiré. Essayez une zone plus petite.'
            : 'Une erreur est survenue lors du chargement des restaurants.'
        }
        onRetry={onRetry}
      />
    )
  } else if (empty && nameQuery?.trim()) {
    body = <EmptyState variant="no-results" searchQuery={nameQuery} onReset={onResetFilters} />
  } else if (empty && hasActiveFilters) {
    body = <EmptyState variant="no-results" onReset={onResetFilters} />
  } else if (empty) {
    body = <EmptyState variant="no-area" />
  } else {
    body = (
      <div style={{ height: totalHeight, position: 'relative', paddingBottom: 12 }}>
        {virtualItems.map(({ item, index, offsetTop }) => (
          <div
            key={item.osm_id}
            style={{ position: 'absolute', top: offsetTop, left: 0, right: 0, height: rowHeight }}
          >
            <PlaceCardItem
              place={item}
              index={index}
              isSelected={item.osm_id === selectedId}
              isHovered={item.osm_id === hoveredId}
              onHover={() => onHover(item.osm_id)}
              onLeave={() => onHover(null)}
              onClick={() => onSelect(item)}
              onToggleFavorite={() => onToggleFavorite(item)}
              onShare={onShare ? () => onShare(item) : undefined}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingTop: header ? 0 : 12,
      }}
    >
      {header && <div ref={headerRef}>{header}</div>}
      {body}
    </div>
  )
})

export default PlaceList
