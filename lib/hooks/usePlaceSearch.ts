// ============================================================
// lib/hooks/usePlaceSearch.ts — search restaurants BEYOND the map viewport.
//   The search bar otherwise only filters already-loaded (visible) places.
//   This queries Nominatim by name, biased to the current map area but NOT
//   bounded to it, so you can find a place anywhere and fly to it.
//   Debounced (400ms), deduped (cancels previous), cached (5 min), min 3 chars.
// ============================================================
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { searchGoogleNearby } from '@/lib/google-client'

export interface PlaceSearchResult {
  /** Stable list key. */
  id: string
  /** OSM id `${osm_type}/${osm_id}` when known (Nominatim); absent for Google. */
  osm_id?: string
  name: string
  context: string // address / area
  lat: number
  lon: number
  category?: string
  rating?: number // Google rating (0–10) when available
  source: 'google' | 'osm'
}

interface NominatimResult {
  osm_type?: string
  osm_id?: number
  display_name: string
  lat: string
  lon: string
  class?: string
  type?: string
}

const CACHE = new Map<string, PlaceSearchResult[]>()
const FOODISH = new Set(['restaurant', 'cafe', 'bar', 'fast_food', 'pub', 'food_court', 'bistro'])

function toResult(r: NominatimResult): PlaceSearchResult | null {
  if (!r.osm_type || r.osm_id == null) return null
  const osm_id = `${r.osm_type}/${r.osm_id}`
  const parts = r.display_name.split(',')
  return {
    id: osm_id,
    osm_id,
    name: parts[0]?.trim() || r.display_name,
    context: parts.slice(1, 3).join(',').trim(),
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    category: r.type,
    source: 'osm',
  }
}

async function nominatim(q: string, center: [number, number] | null): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({
    q,
    format: 'json',
    limit: '8',
    addressdetails: '0',
    'accept-language': 'fr,en',
  })
  // Bias toward the current map area without restricting to it.
  if (center) {
    const [lat, lon] = center
    params.set('viewbox', `${lon - 0.15},${lat + 0.1},${lon + 0.15},${lat - 0.1}`)
    params.set('bounded', '0')
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
  if (!res.ok) return []
  const raw = (await res.json()) as NominatimResult[]
  const mapped = raw.map(toResult).filter((r): r is PlaceSearchResult => r !== null)
  // Prefer food places, keep the rest as fallback.
  mapped.sort(
    (a, b) => Number(FOODISH.has(b.category ?? '')) - Number(FOODISH.has(a.category ?? ''))
  )
  return mapped.slice(0, 6)
}

async function search(q: string, center: [number, number] | null): Promise<PlaceSearchResult[]> {
  const key = `${q.toLowerCase().trim()}|${center ? center.map((n) => n.toFixed(2)).join(',') : ''}`
  const cached = CACHE.get(key)
  if (cached) return cached

  // Prefer Google Maps (far better restaurant coverage). Native only; falls
  // back to Nominatim (OSM) on web or when Google returns nothing.
  let out: PlaceSearchResult[] = []
  try {
    const g = await searchGoogleNearby(q, center)
    out = g.map((r) => ({
      id: `g:${r.lat.toFixed(5)},${r.lon.toFixed(5)}`,
      name: r.name,
      context: 'Google Maps',
      lat: r.lat,
      lon: r.lon,
      rating: r.rating,
      source: 'google' as const,
    }))
  } catch {
    /* fall through to Nominatim */
  }
  if (out.length === 0) out = await nominatim(q, center)

  CACHE.set(key, out)
  return out
}

/** Off-viewport place search. Returns results for the current query. */
export function usePlaceSearch(query: string, center: [number, number] | null) {
  const [results, setResults] = useState<PlaceSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqRef = useRef(0)

  const centerRef = useRef(center)
  centerRef.current = center

  useEffect(() => {
    const q = query.trim()
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.length < 3) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const myReq = ++reqRef.current
    timerRef.current = setTimeout(() => {
      search(q, centerRef.current)
        .then((r) => {
          if (reqRef.current === myReq) {
            setResults(r)
            setLoading(false)
          }
        })
        .catch(() => {
          if (reqRef.current === myReq) {
            setResults([])
            setLoading(false)
          }
        })
    }, 400)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  const clear = useCallback(() => setResults([]), [])
  return { results, loading, clear }
}
