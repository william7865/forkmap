// PlaceList — virtualized with proper empty/error states
'use client'

import { memo } from 'react'
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
  loading,
  error,
  nameQuery,
  hasActiveFilters,
  onRetry,
  onResetFilters,
}: Props) {
  const native = useIsNative()
  const rowHeight = native ? ITEM_HEIGHT_NATIVE : ITEM_HEIGHT
  const { containerRef, virtualItems, totalHeight } = useVirtualList(places, {
    itemHeight: rowHeight,
    overscan: 5,
  })

  // Loading: show skeletons
  if (loading && places.length === 0) return <SkeletonList />

  // Error
  if (error && places.length === 0) {
    return (
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
  }

  // Empty — no results for query
  if (!loading && places.length === 0 && nameQuery?.trim()) {
    return <EmptyState variant="no-results" searchQuery={nameQuery} onReset={onResetFilters} />
  }

  // Empty — filters active but nothing matches
  if (!loading && places.length === 0 && hasActiveFilters) {
    return <EmptyState variant="no-results" onReset={onResetFilters} />
  }

  // Empty — area has no restaurants
  if (!loading && places.length === 0) {
    return <EmptyState variant="no-area" />
  }

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingTop: 12 }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
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
    </div>
  )
})

export default PlaceList
