'use client'
// SwipeRow — swipe a list row left to reveal actions (iOS-style), instead of a
// "⋯" button. `touch-action: pan-y` lets the browser keep vertical scrolling
// while we capture the horizontal drag. A real swipe swallows the click so the
// row doesn't also navigate.
import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export interface SwipeAction {
  label: string
  /** Background colour of the action button. */
  bg: string
  onClick: () => void
}

interface Props {
  actions: SwipeAction[]
  children: React.ReactNode
  actionWidth?: number
}

export default function SwipeRow({ actions, children, actionWidth = 88 }: Props) {
  const maxReveal = actions.length * actionWidth
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startDx = useRef(0)
  const active = useRef(false)
  const swiped = useRef(false)

  const onDown = (e: ReactPointerEvent) => {
    startX.current = e.clientX
    startDx.current = dx
    active.current = true
    swiped.current = false
    setDragging(true)
    // Keep receiving moves even if the finger drifts off the row mid-swipe.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* not all pointer types support capture */
    }
  }
  const onMove = (e: ReactPointerEvent) => {
    if (!active.current) return
    const delta = e.clientX - startX.current
    if (Math.abs(delta) > 6) swiped.current = true
    setDx(Math.max(-maxReveal, Math.min(0, startDx.current + delta)))
  }
  const onUp = () => {
    if (!active.current) return
    active.current = false
    setDragging(false)
    setDx((d) => (d < -maxReveal / 2 ? -maxReveal : 0))
  }
  const close = () => setDx(0)

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Actions sit behind the content, revealed as it slides left. */}
      <div style={{ position: 'absolute', inset: '0 0 0 auto', display: 'flex' }}>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => {
              a.onClick()
              close()
            }}
            style={{
              width: actionWidth,
              border: 'none',
              background: a.bg,
              color: '#fff',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Content. A drag past 6px marks `swiped`, and the capture-phase click
          handler then cancels the tap so the row doesn't navigate/open. */}
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={(e) => {
          if (swiped.current || dx !== 0) {
            e.preventDefault()
            e.stopPropagation()
            close()
          }
        }}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.16,1,0.3,1)',
          background: 'var(--bg)',
          touchAction: 'pan-y',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  )
}
