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
