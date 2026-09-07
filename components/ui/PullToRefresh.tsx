'use client'
// PullToRefresh — tirer vers le bas en haut de page pour rafraîchir (geste
// iOS). Listeners touch NON-passifs : dans une WKWebView, le scroll natif
// (rubber-band) avale le geste si on ne fait pas preventDefault() pendant le
// tirage — les pointer events seuls ne suffisent pas.
import { useEffect, useRef, useState } from 'react'
import { lightTap } from '@/lib/native/haptics'

const THRESHOLD = 64
const MAX_PULL = 96

export default function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
}) {
  const [dy, setDy] = useState(0)
  const [busy, setBusy] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const state = useRef({ startY: 0, pulling: false, dy: 0, busy: false })

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const s = state.current
    const setPull = (v: number) => {
      s.dy = v
      setDy(v)
    }

    const onStart = (e: TouchEvent) => {
      if (s.busy || window.scrollY > 0) return
      s.startY = e.touches[0].clientY
      s.pulling = true
    }
    const onMove = (e: TouchEvent) => {
      if (!s.pulling || s.busy) return
      const d = e.touches[0].clientY - s.startY
      if (d <= 0 || window.scrollY > 0) {
        if (s.dy !== 0) setPull(0)
        return
      }
      // On prend la main sur le scroll natif : sans ça, iOS rubber-band et
      // le geste ne nous parvient plus.
      e.preventDefault()
      setPull(Math.min(MAX_PULL, d * 0.45))
    }
    const onEnd = async () => {
      if (!s.pulling) return
      s.pulling = false
      if (s.dy >= THRESHOLD) {
        s.busy = true
        setBusy(true)
        setPull(48)
        lightTap()
        try {
          await onRefresh()
        } finally {
          s.busy = false
          setBusy(false)
          setPull(0)
        }
      } else {
        setPull(0)
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listeners montés une fois
  }, [])

  return (
    <div ref={wrapRef}>
      {/* Zone du spinner — pousse le contenu pendant le tirage (voulu) */}
      <div
        aria-hidden={dy === 0}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: dy,
          overflow: 'hidden',
          transition: state.current.pulling ? 'none' : 'height 240ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            border: '2.5px solid var(--surface-2)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            opacity: Math.min(1, dy / THRESHOLD),
            transform: busy ? undefined : `rotate(${dy * 3}deg)`,
            animation: busy ? 'spin 0.7s linear infinite' : undefined,
          }}
        />
      </div>
      {children}
    </div>
  )
}
