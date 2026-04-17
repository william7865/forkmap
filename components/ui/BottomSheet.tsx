// ============================================================
// components/ui/BottomSheet.tsx
// Swipeable bottom sheet for mobile layout.
// Used to replace the desktop sidebar on screens < 768px.
// Supports three snap points: peek (64px) → half → full.
// ============================================================
'use client'

import { useState, useRef, useCallback, type ReactNode } from 'react'

type SnapPoint = 'peek' | 'half' | 'full'

interface Props {
  children: ReactNode
  /** Title shown in the drag handle bar */
  title?: string
  /** Subtitle / count shown next to title */
  subtitle?: string
  /** Initial snap position */
  defaultSnap?: SnapPoint
  /** Called when snap changes */
  onSnapChange?: (snap: SnapPoint) => void
  /** Pixels from the bottom edge — use to clear a bottom nav bar */
  bottomOffset?: number
}

export default function BottomSheet({
  children,
  title = 'Restaurants',
  subtitle,
  defaultSnap = 'half',
  onSnapChange,
  bottomOffset = 0,
}: Props) {
  const [snap, setSnap] = useState<SnapPoint>(defaultSnap)
  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)

  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const startH = useRef(0)
  const isDragging = useRef(false)

  // Compute snap heights from window
  const getSnapPx = useCallback((sp: SnapPoint): number => {
    if (typeof window === 'undefined') return 300
    const wh = window.innerHeight
    if (sp === 'peek') return 72
    if (sp === 'half') return Math.round(wh * 0.52)
    return Math.round(wh * 0.92)
  }, [])

  const snapTo = useCallback(
    (sp: SnapPoint) => {
      setSnap(sp)
      setDragOffset(0)
      onSnapChange?.(sp)
    },
    [onSnapChange]
  )

  // Pointer/touch events for dragging
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('[data-no-drag]')) return
      isDragging.current = true
      setDragging(true)
      startY.current = e.clientY
      startH.current = sheetRef.current?.getBoundingClientRect().height ?? getSnapPx(snap)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [snap, getSnapPx]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      const dy = startY.current - e.clientY // positive = dragging up
      const newH = Math.max(40, Math.min(window.innerHeight * 0.95, startH.current + dy))
      setDragOffset(newH - getSnapPx(snap))
    },
    [snap, getSnapPx]
  )

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    setDragging(false)

    const currentH = getSnapPx(snap) + dragOffset
    const wh = window.innerHeight

    // Snap to nearest point
    const peekH = 72
    const halfH = Math.round(wh * 0.52)
    const fullH = Math.round(wh * 0.92)

    const distances: [number, SnapPoint][] = [
      [Math.abs(currentH - peekH), 'peek'],
      [Math.abs(currentH - halfH), 'half'],
      [Math.abs(currentH - fullH), 'full'],
    ]
    distances.sort((a, b) => a[0] - b[0])
    snapTo(distances[0][1])
  }, [snap, dragOffset, getSnapPx, snapTo])

  const currentHeight = getSnapPx(snap) + (dragging ? dragOffset : 0)

  // Tap on handle cycles through snap points
  const handleTap = useCallback(() => {
    if (dragging) return
    const cycle: Record<SnapPoint, SnapPoint> = {
      peek: 'half',
      half: 'full',
      full: 'peek',
    }
    snapTo(cycle[snap])
  }, [snap, snapTo, dragging])

  return (
    <div
      ref={sheetRef}
      style={{
        position: 'fixed',
        bottom: bottomOffset,
        left: 0,
        right: 0,
        height: currentHeight,
        background: 'var(--white)',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -4px 32px rgba(28,25,23,0.14), 0 -1px 0 rgba(28,25,23,0.06)',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: dragging ? 'none' : 'height 320ms cubic-bezier(0.16, 1, 0.3, 1)',
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Drag handle + header */}
      <div
        onClick={handleTap}
        style={{
          flexShrink: 0,
          padding: '10px 16px 8px',
          cursor: 'grab',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          background: 'var(--white)',
          borderBottom: snap !== 'peek' ? '1px solid rgba(28,25,23,0.06)' : 'none',
        }}
      >
        {/* Pill handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--bone)',
            flexShrink: 0,
          }}
        />

        {/* Title row */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ink-60)',
                background: 'rgba(28,25,23,0.05)',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              {subtitle}
            </span>
          )}
          {/* Expand indicator */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ink-60)"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{
              transform: snap === 'full' ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 300ms ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Scrollable content */}
      {snap !== 'peek' && (
        <div
          data-no-drag
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
