'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Scroll reveal that ENHANCES an already-visible default.
//
// The previous version rendered at `opacity: 0` and waited for an
// IntersectionObserver to flip it. Anything that renders without scrolling —
// headless screenshotters, preview/OG crawlers, a background browser tab where
// transitions are throttled — kept the whole page blank below the fold. A
// reveal must never be the thing that decides whether content exists.
//
// So: the server HTML and the first client paint are fully visible. Only after
// the client confirms it can animate do we hide an element that is genuinely
// below the fold, and even then a failsafe timer shows it no matter what.

// useLayoutEffect warns during SSR; on the server there is no layout to read.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/** Elements already this close to the fold never animate — they're on screen at load. */
const NEAR_FOLD_PX = 120
/** Show unconditionally after this long, whatever the observer did. */
const FAILSAFE_MS = 2500

export function Reveal({
  children,
  delay = 0,
  y = 20,
  duration = 700,
  style,
  className,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  duration?: number
  style?: React.CSSProperties
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  // `null` = not armed (render visible). `false` = armed and waiting. `true` = revealed.
  const [state, setState] = useState<boolean | null>(null)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return
    // Already on screen at first paint: it was never going to be a "reveal".
    if (el.getBoundingClientRect().top < window.innerHeight - NEAR_FOLD_PX) return
    setState(false)
  }, [])

  useEffect(() => {
    if (state !== false) return
    const el = ref.current
    if (!el) return
    const show = () => setState(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          show()
          io.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    const failsafe = window.setTimeout(show, FAILSAFE_MS)
    return () => {
      io.disconnect()
      window.clearTimeout(failsafe)
    }
  }, [state])

  const armed = state === false

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: armed ? 0 : 1,
        transform: armed ? `translateY(${y}px)` : 'none',
        transition: armed
          ? 'none'
          : `opacity ${duration}ms var(--ease-out) ${delay}ms, transform ${duration}ms var(--ease-out) ${delay}ms`,
        willChange: state === true ? 'opacity, transform' : undefined,
      }}
    >
      {children}
    </div>
  )
}
