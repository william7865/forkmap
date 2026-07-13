// ============================================================
// lib/import/confidence.ts — decide whether a resolution is trustworthy enough
// to attach silently. Pure, no network.
//
// A guess is only `resolved` when the top result BOTH matches the guessed name
// strongly AND clearly beats the runner-up. Anything else asks the user — a
// wrong favourite pollutes the map and the lists, so we never guess in silence.
// ============================================================
import type { PlaceSearchResult } from '@/lib/hooks/usePlaceSearch'
import type { PlaceGuess } from '@/lib/import/candidates'

export type Resolution =
  | { status: 'resolved'; place: PlaceSearchResult }
  | { status: 'ambiguous'; candidates: PlaceSearchResult[] }
  | { status: 'failed' }

/** Strong match with the guessed name. */
const STRONG = 0.8
/** Minimum lead over the runner-up to attach without asking. */
const LEAD = 0.15
/** Never offer more than this many choices. */
const MAX_CANDIDATES = 3

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u{0300}-\u{036F}]/gu, '') // strip combining diacritics (explicit escape — literal combining marks corrupt on copy/paste)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 0–1 similarity between a guessed name and a result name.
 * Token-based (not edit distance): venue names differ by added qualifiers
 * ("- Restaurant", "Paris"), and token overlap handles that gracefully.
 */
export function nameSimilarity(guess: string, candidate: string): number {
  const g = normalize(guess)
  const c = normalize(candidate)
  if (!g || !c) return 0
  if (g === c) return 1

  const gt = new Set(g.split(' '))
  const ct = new Set(c.split(' '))
  let shared = 0
  for (const t of gt) if (ct.has(t)) shared++

  // Recall against the GUESS: the result may legitimately add tokens
  // ("Le Train Bleu" → "Le Train Bleu - Restaurant") without being punished.
  const recall = shared / gt.size
  // …but a result stuffed with extra tokens is less certain, so temper it.
  const precision = shared / ct.size

  // A single-word guess ("Bleu", "Ito", "Septime") trivially gets recall = 1
  // from ANY candidate that merely contains that word, however long and
  // unrelated the rest of the candidate's name is ("Bleu" ⊂ "Bleu Lagon
  // Miami"; "Septime" ⊂ "Septime La Cave", a real but DIFFERENT venue from the
  // same group). One token is too little evidence to lean on recall — so
  // precision (how much of the candidate's name is actually explained) gets
  // equal weight instead of being tempered down. Multi-word guesses keep the
  // recall-leaning blend: a result adding a harmless qualifier must not be
  // punished for it.
  if (gt.size === 1) return recall * 0.5 + precision * 0.5

  return recall * 0.75 + precision * 0.25
}

export function scoreResolution(guess: PlaceGuess, results: PlaceSearchResult[]): Resolution {
  if (results.length === 0) return { status: 'failed' }

  const scored = results
    .map((place) => ({ place, score: nameSimilarity(guess.name, place.name) }))
    .sort((a, b) => b.score - a.score)

  const top = scored[0]
  const runnerUp = scored[1]

  const strong = top.score >= STRONG
  const clear = !runnerUp || top.score - runnerUp.score >= LEAD

  if (strong && clear) return { status: 'resolved', place: top.place }

  return {
    status: 'ambiguous',
    candidates: scored.slice(0, MAX_CANDIDATES).map((s) => s.place),
  }
}
