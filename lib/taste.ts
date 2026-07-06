// ============================================================
// lib/taste.ts — Lightweight, persistable taste profile
//   Learns from "garder" (save) / "passer" (pass) decisions in the
//   Surprends-moi deck: each cuisine gains/loses affinity, which then
//   biases future rankings. Pure & testable; persistence (localStorage)
//   lives in the UI layer.
// ============================================================

import type { PlaceCard } from '@/types'

export interface TasteProfile {
  /** cuisine (lowercased) → affinity score, clamped to [-CLAMP, CLAMP] */
  cuisines: Record<string, number>
}

const SAVE_DELTA = 1
const PASS_DELTA = -0.4
const CLAMP = 5
/** Max absolute bias rankDeck applies from taste, so it nudges without dominating. */
export const TASTE_MAX_BIAS = 0.5

export function emptyProfile(): TasteProfile {
  return { cuisines: {} }
}

/** localStorage key where the Surprise deck persists the learned taste. */
export const TASTE_STORAGE_KEY = 'forkmap_taste'

/** Load the persisted taste profile (shared by the deck and the home). */
export function loadTasteProfile(): TasteProfile {
  if (typeof window === 'undefined') return emptyProfile()
  try {
    const raw = localStorage.getItem(TASTE_STORAGE_KEY)
    if (!raw) return emptyProfile()
    const p = JSON.parse(raw)
    return p && typeof p.cuisines === 'object' ? { cuisines: p.cuisines } : emptyProfile()
  } catch {
    return emptyProfile()
  }
}

/** Persist the taste profile to localStorage (pendant of loadTasteProfile). */
export function saveTasteProfile(profile: TasteProfile): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TASTE_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

/** Affinity granted to a cuisine the user explicitly declares they love. */
export const TASTE_SEED_VALUE = 3

/**
 * Additively seed liked cuisines (onboarding quiz). For each key,
 * `cuisines[k] = max(existing, value)` — never lowers a learned affinity.
 * Returns a new profile.
 */
export function seedProfile(
  profile: TasteProfile,
  keys: string[],
  value = TASTE_SEED_VALUE
): TasteProfile {
  const cuisines = { ...profile.cuisines }
  for (const k of keys) {
    cuisines[k] = Math.max(cuisines[k] ?? 0, value)
  }
  return { cuisines }
}

/**
 * Reconcile declared cuisines when re-editing tastes from settings.
 * `optionKeys` is the full set of quiz options currently on screen.
 *  - selected key            → max(existing, value)  (declare / reinforce)
 *  - unselected & ≥ value    → 0                      (retract the declaration)
 *  - unselected & < value    → unchanged              (keep learned small/neg values)
 * Returns a new profile.
 */
export function setDeclaredCuisines(
  profile: TasteProfile,
  optionKeys: string[],
  selectedKeys: string[],
  value = TASTE_SEED_VALUE
): TasteProfile {
  const selected = new Set(selectedKeys)
  const cuisines = { ...profile.cuisines }
  for (const k of optionKeys) {
    const existing = cuisines[k] ?? 0
    if (selected.has(k)) cuisines[k] = Math.max(existing, value)
    // Only retract a pure declaration (exactly the seed); keep affinity the deck
    // learned beyond it (> value) — a settings toggle must not wipe earned taste.
    else if (existing === value) cuisines[k] = 0
  }
  return { cuisines }
}

/** Distinct lowercased cuisine + FSQ category keys for a place. */
export function cuisineKeys(place: PlaceCard): string[] {
  const keys: string[] = []
  if (place.cuisine) keys.push(place.cuisine.toLowerCase())
  for (const c of place.fsq?.categories ?? []) {
    if (c.name) keys.push(c.name.toLowerCase())
  }
  return [...new Set(keys)]
}

function adjust(profile: TasteProfile, place: PlaceCard, delta: number): TasteProfile {
  const keys = cuisineKeys(place)
  if (keys.length === 0) return profile
  const cuisines = { ...profile.cuisines }
  for (const k of keys) {
    const next = (cuisines[k] ?? 0) + delta
    cuisines[k] = Math.max(-CLAMP, Math.min(CLAMP, next))
  }
  return { cuisines }
}

/** Reinforce the cuisines of a kept place. Returns a new profile. */
export function recordSave(profile: TasteProfile, place: PlaceCard): TasteProfile {
  return adjust(profile, place, SAVE_DELTA)
}

/** Gently dampen the cuisines of a passed place. Returns a new profile. */
export function recordPass(profile: TasteProfile, place: PlaceCard): TasteProfile {
  return adjust(profile, place, PASS_DELTA)
}

/**
 * Taste bias for a place in [-TASTE_MAX_BIAS, TASTE_MAX_BIAS].
 * Average of the place's cuisine affinities, scaled by CLAMP.
 */
export function tasteBoost(profile: TasteProfile, place: PlaceCard): number {
  const keys = cuisineKeys(place)
  let sum = 0
  let n = 0
  for (const k of keys) {
    const v = profile.cuisines[k]
    if (v != null) {
      sum += v
      n++
    }
  }
  if (n === 0) return 0
  const avg = sum / n
  return Math.max(-TASTE_MAX_BIAS, Math.min(TASTE_MAX_BIAS, (avg / CLAMP) * TASTE_MAX_BIAS))
}

/** Whether a place matches the user's tastes enough to flag "fait pour toi". */
export function isMadeForYou(profile: TasteProfile, place: PlaceCard): boolean {
  return tasteBoost(profile, place) >= TASTE_MAX_BIAS * 0.5
}
