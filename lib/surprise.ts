// ============================================================
// lib/surprise.ts — "Surprends-moi" decision engine
//   Pure, testable logic that picks ONE restaurant for a user
//   who doesn't know what to eat. Optionally biased by a mood
//   (Réconfort / Healthy / Festif / Rapide / Découverte) plus
//   quick budget / distance / open-now constraints.
//
//   Weighted-random pick among the strongest candidates so the
//   result feels alive (not always the #1), while staying
//   relevant. Randomness is injectable for deterministic tests.
// ============================================================

import type { PlaceCard } from '@/types'
import { tasteBoost, type TasteProfile } from '@/lib/taste'

export type Mood = 'comfort' | 'healthy' | 'festive' | 'fast' | 'discovery'

/** UI metadata for the mood chips (libellés FR ; icônes mappées dans SurpriseSheet). */
export const MOODS: { id: Mood; label: string }[] = [
  { id: 'comfort', label: 'Réconfort' },
  { id: 'healthy', label: 'Healthy' },
  { id: 'festive', label: 'Festif' },
  { id: 'fast', label: 'Rapide' },
  { id: 'discovery', label: 'Découverte' },
]

export interface SurpriseOptions {
  mood?: Mood | null
  /** Max price tier (1–4). Unknown prices are kept (inclusive). */
  maxPrice?: 1 | 2 | 3 | 4 | null
  /** Max distance from map center, in meters. Unknown distances are kept. */
  maxDistance?: number | null
  /** Only consider places known to be open now. */
  openNow?: boolean
  /** osm_ids already shown — excluded so "Une autre" never repeats. */
  exclude?: Set<string> | string[]
  /** User's favorite cuisines (lowercased) — used by the "discovery" mood. */
  knownCuisines?: string[]
}

export interface SurpriseResult {
  place: PlaceCard
  /** Short French chips explaining the pick (max 3). */
  reasons: string[]
}

const MOOD_KEYWORDS: Record<Mood, string[]> = {
  comfort: [
    'burger',
    'pizza',
    'pizz',
    'ital',
    'french',
    'franç',
    'bistro',
    'brasserie',
    'ramen',
    'nouilles',
    'noodle',
    'kebab',
    'tacos',
    'fromage',
    'raclette',
    'fondue',
    'crêpe',
    'crepe',
    'comfort',
    'pâtes',
    'pasta',
  ],
  healthy: [
    'salad',
    'salade',
    'poke',
    'bowl',
    'veg',
    'vegan',
    'végé',
    'vege',
    'healthy',
    'méditerran',
    'mediterran',
    'sushi',
    'japonais',
    'japanese',
    'juice',
    'jus',
    'bio',
    'organic',
  ],
  festive: [
    'bar',
    'tapas',
    'brunch',
    'cocktail',
    'grill',
    'steak',
    'viande',
    'fondue',
    'wine',
    'vin',
    'champagne',
    'lounge',
    'rooftop',
    'fruits de mer',
    'seafood',
  ],
  fast: [
    'fast',
    'burger',
    'sandwich',
    'kebab',
    'tacos',
    'street',
    'snack',
    'pizza',
    'poke',
    'wrap',
    'salad',
    'salade',
    'sushi',
  ],
  discovery: [], // handled via novelty, not keywords
}

/** Lowercased haystack of a place's cuisine + FSQ category names. */
function cuisineHaystack(place: PlaceCard): string {
  const parts: string[] = []
  if (place.cuisine) parts.push(place.cuisine)
  for (const c of place.fsq?.categories ?? []) {
    if (c.name) parts.push(c.name)
  }
  return parts.join(' ').toLowerCase()
}

/**
 * Affinity bonus [0–~0.7] of a place for a given mood. 0 when no mood.
 * Exported for testing and for the UI to highlight strong matches.
 */
export function moodAffinity(place: PlaceCard, opts: SurpriseOptions): number {
  const mood = opts.mood
  if (!mood) return 0

  const hay = cuisineHaystack(place)

  if (mood === 'discovery') {
    // Reward cuisines the user does NOT already favorite, and rarer types.
    const known = opts.knownCuisines ?? []
    const cuisine = (place.cuisine ?? '').toLowerCase()
    if (!cuisine) return 0.1
    const isKnown = known.some((k) => cuisine.includes(k) || k.includes(cuisine))
    return isKnown ? 0 : 0.5
  }

  const keywords = MOOD_KEYWORDS[mood]
  let bonus = keywords.some((k) => hay.includes(k)) ? 0.45 : 0

  // Per-mood signal nudges
  if (mood === 'fast') {
    if (place.open_now === true) bonus += 0.15
    if (place.distance != null && place.distance <= 600) bonus += 0.15
  }
  if (mood === 'festive') {
    if ((place.fsq?.price ?? 0) >= 2) bonus += 0.1
    if (place.osm_enriched?.live_music) bonus += 0.1
  }
  if (mood === 'healthy') {
    if (place.osm_enriched?.organic || place.osm_enriched?.vegetarian_friendly) bonus += 0.15
  }

  return bonus
}

/** Combined ranking weight of a candidate (always > 0). */
function candidateWeight(place: PlaceCard, opts: SurpriseOptions): number {
  const base = place.score ?? 0.4
  return Math.max(0.001, base * 0.6 + moodAffinity(place, opts))
}

function toSet(exclude?: Set<string> | string[]): Set<string> {
  if (!exclude) return new Set()
  return exclude instanceof Set ? exclude : new Set(exclude)
}

function walkMinutes(metres: number): number {
  return Math.max(1, Math.round(metres / 80))
}

/** Build up to 3 short French reason chips for a pick. */
export function buildReasons(place: PlaceCard, opts: SurpriseOptions): string[] {
  const reasons: string[] = []
  const rating = place.fsq?.rating

  if ((place.wikidata?.michelin_stars ?? place.osm_enriched?.michelin ?? 0) > 0) {
    reasons.push('★ Michelin')
  }
  if (rating != null && rating >= 8.5) {
    reasons.push(`Coup de cœur · ${rating.toFixed(1)}`)
  } else if (rating != null && rating >= 7) {
    reasons.push(`Bien noté · ${rating.toFixed(1)}`)
  }
  if (place.open_now === true) {
    reasons.push('Ouvert maintenant')
  }
  if (place.distance != null) {
    reasons.push(`À ${walkMinutes(place.distance)} min à pied`)
  }
  if (reasons.length < 3 && opts.mood) {
    const moodMeta = MOODS.find((m) => m.id === opts.mood)
    const cuisine = place.cuisine
    if (cuisine) reasons.push(cuisine)
    else if (moodMeta) reasons.push(moodMeta.label)
  } else if (reasons.length === 0 && place.cuisine) {
    reasons.push(place.cuisine)
  }

  return reasons.slice(0, 3)
}

/**
 * Pick ONE restaurant for the "Surprends-moi" experience.
 *
 * - Applies the (optional) budget / distance / open-now constraints,
 *   keeping places with unknown data (inclusive — same convention as
 *   `applyFilters`), so the pool rarely collapses to empty.
 * - Ranks the survivors by composite score × mood affinity.
 * - Picks via weighted random among the top candidates, so repeated
 *   taps surface variety instead of always the single best place.
 *
 * @param rng injectable [0,1) source — defaults to Math.random; pass a
 *            seeded function in tests for determinism.
 * @returns the chosen place + reason chips, or null if nothing matches.
 */
export function pickSurprise(
  places: PlaceCard[],
  opts: SurpriseOptions = {},
  rng: () => number = Math.random
): SurpriseResult | null {
  const exclude = toSet(opts.exclude)

  let pool = places.filter((p) => !exclude.has(p.osm_id))
  if (opts.openNow) pool = pool.filter((p) => p.open_now === true)
  if (opts.maxPrice != null) {
    pool = pool.filter((p) => p.fsq?.price == null || p.fsq.price <= opts.maxPrice!)
  }
  if (opts.maxDistance != null) {
    pool = pool.filter((p) => p.distance == null || p.distance <= opts.maxDistance!)
  }

  if (pool.length === 0) return null

  const scored = pool
    .map((p) => ({ place: p, weight: candidateWeight(p, opts) }))
    .sort((a, b) => b.weight - a.weight)

  const top = scored.slice(0, Math.min(8, scored.length))
  const total = top.reduce((sum, x) => sum + x.weight, 0)

  let r = rng() * total
  let chosen = top[0].place
  for (const x of top) {
    r -= x.weight
    if (r <= 0) {
      chosen = x.place
      break
    }
  }

  return { place: chosen, reasons: buildReasons(chosen, opts) }
}

/**
 * Rank a whole deck for the swipe / spotlight experience.
 *
 * Same filtering as pickSurprise, then orders every survivor by
 * composite weight + taste bias (from the user's save/pass history) +
 * a tiny jitter so the deck varies between openings without losing
 * relevance. Returns each place with its reason chips.
 *
 * @param rng injectable [0,1) source — pass a constant in tests for
 *            deterministic ordering by weight.
 */
export function rankDeck(
  places: PlaceCard[],
  opts: SurpriseOptions = {},
  profile?: TasteProfile | null,
  rng: () => number = Math.random
): SurpriseResult[] {
  const exclude = toSet(opts.exclude)

  let pool = places.filter((p) => !exclude.has(p.osm_id))
  if (opts.openNow) pool = pool.filter((p) => p.open_now === true)
  if (opts.maxPrice != null) {
    pool = pool.filter((p) => p.fsq?.price == null || p.fsq.price <= opts.maxPrice!)
  }
  if (opts.maxDistance != null) {
    pool = pool.filter((p) => p.distance == null || p.distance <= opts.maxDistance!)
  }

  return pool
    .map((p) => {
      const taste = profile ? tasteBoost(profile, p) : 0
      const jitter = rng() * 0.06
      return { place: p, weight: candidateWeight(p, opts) + taste + jitter }
    })
    .sort((a, b) => b.weight - a.weight)
    .map((s) => ({ place: s.place, reasons: buildReasons(s.place, opts) }))
}
