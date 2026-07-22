'use client'
import { useEffect, useRef, useState } from 'react'

// Scroll-reveal wrapper: fades + rises its children the first time they enter the
// viewport. Respects prefers-reduced-motion (shows immediately, no transform) and
// degrades to visible when IntersectionObserver is unavailable.
export function Reveal({
  children,
  delay = 0,
  y = 20,
  style,
  className,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  style?: React.CSSProperties
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${y}px)`,
        transition: `opacity 640ms var(--ease-out) ${delay}ms, transform 640ms var(--ease-out) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
