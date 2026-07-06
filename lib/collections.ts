// ============================================================
// lib/collections.ts — Data-driven editorial collections for the
//   native home. Each collection groups the already-fetched places
//   by a theme (predicate + sort). Pure & testable; the UI renders
//   whatever survives the MIN threshold. Greedy dedup across
//   collections (priority order) keeps rails varied.
// ============================================================

import type { PlaceCard } from '@/types'
import { type TasteProfile, isMadeForYou, tasteBoost } from '@/lib/taste'
import { frCuisine } from '@/lib/cuisine'

export type CollectionIcon = 'sparkles' | 'star' | 'clock' | 'walk' | 'utensils'

export interface Collection {
  id: string
  title: string
  subtitle?: string
  icon: CollectionIcon
  places: PlaceCard[]
}

/** Collections smaller than this are dropped (not editorial enough). */
const MIN = 3
/** Max cards per rail. */
const MAX = 10
/** "À deux pas" radius, meters. */
const WALK_RADIUS = 400

function michelin(p: PlaceCard): number {
  return p.wikidata?.michelin_stars ?? p.osm_enriched?.michelin ?? 0
}
function rating(p: PlaceCard): number {
  return p.fsq?.rating ?? 0
}
function cuisineOf(p: PlaceCard): string | undefined {
  return p.cuisine ?? p.fsq?.categories?.[0]?.name
}
/** Composite quality used by the "coups de cœur" catch-all rail. */
function quality(p: PlaceCard): number {
  return michelin(p) * 10 + rating(p)
}

interface Spec {
  id: string
  title: string
  icon: CollectionIcon
  /** Build the ordered candidate list from the (deduped) pool. */
  pick: (pool: PlaceCard[]) => PlaceCard[]
}

/** Most frequent cuisine key in the pool with at least MIN places, or null. */
function topCuisine(pool: PlaceCard[]): string | null {
  const counts = new Map<string, number>()
  for (const p of pool) {
    const c = cuisineOf(p)?.toLowerCase()
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  let best: string | null = null
  let bestN = 0
  for (const [c, n] of counts) {
    if (n > bestN) {
      best = c
      bestN = n
    }
  }
  return best && bestN >= MIN ? best : null
}

/**
 * Build editorial collections from the fetched places.
 * @param excludeId  osm_id of the hero (kept out of every rail).
 */
export function buildCollections(
  places: PlaceCard[],
  taste: TasteProfile,
  excludeId?: string
): Collection[] {
  const pool = excludeId ? places.filter((p) => p.osm_id !== excludeId) : places

  const specs: Spec[] = [
    {
      id: 'for-you',
      title: 'Fait pour toi',
      icon: 'sparkles',
      pick: (ps) =>
        ps
          .filter((p) => isMadeForYou(taste, p))
          .sort((a, b) => tasteBoost(taste, b) - tasteBoost(taste, a)),
    },
    {
      id: 'michelin',
      title: 'Étoilés & distingués',
      icon: 'star',
      pick: (ps) => ps.filter((p) => michelin(p) > 0).sort((a, b) => quality(b) - quality(a)),
    },
    {
      id: 'walk',
      title: 'À deux pas',
      icon: 'walk',
      pick: (ps) =>
        ps
          .filter((p) => p.distance != null && p.distance < WALK_RADIUS)
          .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)),
    },
    {
      id: 'open',
      title: 'Ouvert maintenant',
      icon: 'clock',
      pick: (ps) =>
        ps
          .filter((p) => p.open_now === true)
          .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)),
    },
    {
      id: 'neighborhood',
      title: 'Coups de cœur du quartier',
      icon: 'star',
      pick: (ps) => [...ps].sort((a, b) => quality(b) - quality(a)),
    },
  ]

  // "{Cuisine} du moment" is dynamic — insert it before the catch-all rail.
  const cuisineKey = topCuisine(pool)
  if (cuisineKey) {
    specs.splice(specs.length - 1, 0, {
      id: `cuisine-${cuisineKey}`,
      title: `${frCuisine(cuisineKey)} du moment`,
      icon: 'utensils',
      pick: (ps) =>
        ps
          .filter((p) => cuisineOf(p)?.toLowerCase() === cuisineKey)
          .sort((a, b) => quality(b) - quality(a)),
    })
  }

  const used = new Set<string>()
  const out: Collection[] = []
  for (const spec of specs) {
    const available = pool.filter((p) => !used.has(p.osm_id))
    const picked = spec.pick(available).slice(0, MAX)
    if (picked.length < MIN) continue
    picked.forEach((p) => used.add(p.osm_id))
    out.push({ id: spec.id, title: spec.title, icon: spec.icon, places: picked })
  }
  return out
}
