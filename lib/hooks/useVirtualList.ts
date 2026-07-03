// ============================================================
// lib/hooks/useVirtualList.ts
// Lightweight windowed list — no external dep needed.
// Renders only the items in the viewport + overscan buffer.
// ============================================================
'use client'

import { useRef, useState, useEffect } from 'react'

interface UseVirtualListOptions {
  itemHeight: number // fixed row height in px
  overscan?: number // extra rows above/below viewport (default 5)
  /** Height of non-virtualized content rendered above the list inside the same
      scroll container (e.g. an editorial header). Shifts the visible window. */
  leadingOffset?: number
}

interface UseVirtualListReturn<T> {
  containerRef: React.RefObject<HTMLDivElement>
  virtualItems: { item: T; index: number; offsetTop: number }[]
  totalHeight: number
}

export function useVirtualList<T>(
  items: T[],
  { itemHeight, overscan = 6, leadingOffset = 0 }: UseVirtualListOptions
): UseVirtualListReturn<T> {
  const containerRef = useRef<HTMLDivElement>(null!)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(600)

  // Track container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(([entry]) => {
      setViewportHeight(entry.contentRect.height)
    })
    ro.observe(el)
    setViewportHeight(el.clientHeight)

    const handleScroll = () => setScrollTop(el.scrollTop)
    el.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const totalHeight = items.length * itemHeight

  // The list starts `leadingOffset` px down the scroll content (below the
  // header), so shift the scroll position into list-space before windowing.
  const listScroll = scrollTop - leadingOffset
  const startIndex = Math.max(0, Math.floor(listScroll / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((listScroll + viewportHeight) / itemHeight) + overscan
  )

  const virtualItems = []
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({ item: items[i], index: i, offsetTop: i * itemHeight })
  }

  return { containerRef, virtualItems, totalHeight }
}
