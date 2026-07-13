// ============================================================
// lib/import/candidates.ts — turn a social post's caption into a ranked list of
// restaurant-name guesses. Pure, no network, fully testable.
//
// Food creators overwhelmingly mark the venue with a 📍 pin. That convention is
// the strongest signal there is — and the one a generic extractor misses.
// ============================================================
import type { ImportCandidate } from '@/lib/import/parse'

export interface PlaceGuess {
  name: string
  /** City / area, when the caption gives one ("Le Train Bleu, Paris 12e"). */
  city: string | null
  /** 0–1. Drives which guess the resolver tries first. */
  confidence: number
}

/** Pin-style markers creators use right before the venue name. */
const PIN = /[📍📌🏠🍽🍴]\s*/u

/** Hashtags that never name a venue. */
const GENERIC = new Set([
  'paris',
  'lyon',
  'marseille',
  'bordeaux',
  'lille',
  'france',
  'food',
  'foodporn',
  'foodie',
  'restaurant',
  'resto',
  'miam',
  'pourtoi',
  'foryou',
  'fyp',
  'viral',
  'tiktok',
  'reels',
  'bonneadresse',
  'bonnesadresses',
  'adresse',
  'cuisine',
  'chef',
])

/** Words that can't start a venue name, so a capitalised run starting here is noise. */
const STOPWORDS = new Set(['Je', "J'ai", 'On', 'Nous', 'Il', 'Elle', 'Le meilleur', 'Un', 'Une'])

function clean(s: string): string {
  return s
    .replace(/[#@]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.\-–—:;!?]+|[\s,.\-–—:;!?]+$/g, '')
    .trim()
}

/**
 * Split "Le Train Bleu, Paris 12e" into { name, city }.
 * The city is the trailing comma-separated chunk when it looks like a place.
 */
function splitNameCity(raw: string): { name: string; city: string | null } {
  const parts = raw.split(',').map(clean).filter(Boolean)
  if (parts.length >= 2) {
    return { name: parts[0], city: parts.slice(1).join(', ') }
  }
  return { name: parts[0] ?? '', city: null }
}

/** "kodawari.ramen" → "kodawari ramen" */
function humanizeHandle(handle: string): string {
  return handle.replace(/[._]+/g, ' ').trim()
}

/** Runs of capitalised words ("Le Train Bleu") — a venue name in a narrative caption. */
function capitalisedRuns(text: string): string[] {
  const runs: string[] = []
  // Words starting with an uppercase letter, possibly chained with lowercase articles.
  const re = /\b([A-ZÀ-Ý][\p{L}'’-]+(?:\s+(?:de|du|des|le|la|les|d'|l')?\s*[A-ZÀ-Ý][\p{L}'’-]+)+)/gu
  for (const m of text.matchAll(re)) {
    const run = clean(m[1])
    if (run.length >= 4 && !STOPWORDS.has(run)) runs.push(run)
  }
  return runs
}

/**
 * Rank restaurant-name guesses from a parsed post.
 * Ordered by confidence, deduped (case-insensitive), never empty-named.
 */
export function extractPlaceCandidates(post: ImportCandidate): PlaceGuess[] {
  const text = `${post.title} ${post.description}`.trim()
  const out: PlaceGuess[] = []

  // 1. The pin marker — the strongest signal.
  const pinIdx = text.search(PIN)
  if (pinIdx >= 0) {
    // Take what follows the pin, up to a line break or a sentence end.
    const after = text.slice(pinIdx).replace(PIN, '')
    const chunk = after.split(/[\n•|]|(?:\s[-–—]\s)/)[0] ?? ''
    const { name, city } = splitNameCity(chunk)
    if (name.length >= 2) out.push({ name, city, confidence: 0.95 })
  }

  // 2. The account handle — food venues often post from their own account.
  if (post.handle) {
    const name = humanizeHandle(post.handle)
    if (name.length >= 3 && !GENERIC.has(name.replace(/\s/g, ''))) {
      out.push({ name, city: null, confidence: 0.6 })
    }
  }

  // 3. Capitalised runs in the caption — the narrative case Albo misses.
  for (const run of capitalisedRuns(text)) {
    out.push({ name: run, city: null, confidence: 0.5 })
  }

  // 4. Non-generic hashtags, last resort.
  for (const tag of post.hashtags) {
    if (!GENERIC.has(tag) && tag.length >= 4) {
      out.push({ name: tag, city: null, confidence: 0.2 })
    }
  }

  // Dedupe (case-insensitive), keep the highest confidence, sort desc.
  const best = new Map<string, PlaceGuess>()
  for (const g of out) {
    const key = g.name.toLowerCase()
    const prev = best.get(key)
    if (!prev || g.confidence > prev.confidence) {
      best.set(key, { ...g, city: g.city ?? prev?.city ?? null })
    }
  }
  return [...best.values()].sort((a, b) => b.confidence - a.confidence)
}
