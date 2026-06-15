// ============================================================
// lib/districts.ts — Arrondissement / quartier extraction
//   Paris (codes postaux 750xx / 751xx) → « Paris 11ᵉ », bien fini.
//   Ailleurs → repli sur district / quartier / ville (OSM).
//   Pur et testable ; alimente le filtre par zone.
// ============================================================

import type { PlaceCard } from '@/types'

/**
 * Parse a Paris arrondissement number from a postcode.
 * 75001 → 1, 75011 → 11, 75116 → 16. Returns null if not Paris.
 */
export function parisArrondissement(postcode?: string): number | null {
  if (!postcode) return null
  const digits = postcode.replace(/\s/g, '')
  if (!/^75\d{3}$/.test(digits)) return null
  const n = parseInt(digits, 10) % 100
  if (n < 1 || n > 20) return null
  return n
}

/** « Paris 1ᵉʳ », « Paris 11ᵉ ». */
export function parisLabel(n: number): string {
  return n === 1 ? 'Paris 1ᵉʳ' : `Paris ${n}ᵉ`
}

/**
 * Human label for a place's district/zone, or null when unknown.
 * Order: Paris arrondissement (postcode) → OSM district → city.
 */
export function placeDistrict(place: PlaceCard): string | null {
  const e = place.osm_enriched
  const arr = parisArrondissement(e?.postcode)
  if (arr != null) return parisLabel(arr)
  if (e?.district) return e.district
  if (e?.city) return e.city
  return null
}

/**
 * Distinct district labels present in a list of places, sorted.
 * Paris arrondissements sort numerically and ahead of other zones.
 */
export function extractDistricts(places: PlaceCard[]): string[] {
  const set = new Set<string>()
  for (const p of places) {
    const d = placeDistrict(p)
    if (d) set.add(d)
  }
  const parisRank = (label: string): number => {
    const m = label.match(/^Paris (\d+)/)
    return m ? parseInt(m[1], 10) : Infinity
  }
  return [...set].sort((a, b) => {
    const ra = parisRank(a)
    const rb = parisRank(b)
    if (ra !== rb) return ra - rb
    return a.localeCompare(b, 'fr')
  })
}
