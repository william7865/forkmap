// Transporte un lieu à ouvrir vers l'écran Carte (favoris / resto partagé → fiche).
// Le lien /?select=<osm_id> déclenche l'ouverture ; le lieu complet passe par ici
// (mémoire + sessionStorage de secours pour survivre à la navigation).
import type { PlaceCard } from '@/types'

let pending: PlaceCard | null = null
const KEY = 'fm_pending_select'

export function setPendingSelect(p: PlaceCard): void {
  pending = p
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* sessionStorage indispo → on garde la version mémoire */
  }
}

export function takePendingSelect(): PlaceCard | null {
  if (pending) {
    const p = pending
    pending = null
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* noop */
    }
    return p
  }
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) {
      sessionStorage.removeItem(KEY)
      return JSON.parse(raw) as PlaceCard
    }
  } catch {
    /* noop */
  }
  return null
}
