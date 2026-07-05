// lib/recent.ts — recently-viewed restaurants (localStorage), surfaced in the
// search dropdown so you can jump back to a place you were comparing.
import type { PlaceCard } from '@/types'

const KEY = 'forkmap_recent_places_v1'
const MAX = 10

export function getRecentPlaces(): PlaceCard[] {
  if (typeof window === 'undefined') return []
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function addRecentPlace(p: PlaceCard): void {
  if (typeof window === 'undefined' || !p?.osm_id) return
  const list = getRecentPlaces().filter((x) => x.osm_id !== p.osm_id)
  list.unshift(p)
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* quota — ignore */
  }
}
