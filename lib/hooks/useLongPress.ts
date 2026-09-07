'use client'
// useLongPress — appui long iOS (~450 ms) pour ouvrir un menu contextuel
// (ActionSheet) sur une carte ou une ligne. Annulé si le doigt bouge (> 8 px,
// donc le scroll ne déclenche jamais), haptique au déclenchement. Retourne des
// handlers pointer à étaler sur l'élément.
import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { lightTap } from '@/lib/native/haptics'

const DELAY = 450
const MOVE_TOLERANCE = 8

export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef({ x: 0, y: 0 })
  const fired = useRef(false)

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    fired.current = false
    start.current = { x: e.clientX, y: e.clientY }
    clear()
    timer.current = setTimeout(() => {
      fired.current = true
      lightTap()
      onLongPress()
    }, DELAY)
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!timer.current) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    if (Math.abs(dx) > MOVE_TOLERANCE || Math.abs(dy) > MOVE_TOLERANCE) clear()
  }
  const onPointerUp = () => clear()
  const onPointerCancel = () => clear()
  // Un appui long qui a déclenché ne doit pas AUSSI naviguer au relâchement.
  const onClickCapture = (e: React.MouseEvent) => {
    if (fired.current) {
      e.preventDefault()
      e.stopPropagation()
      fired.current = false
    }
  }
  // Supprime le menu contextuel navigateur (long-press WebView).
  const onContextMenu = (e: React.MouseEvent) => e.preventDefault()

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
    onContextMenu,
  }
}
