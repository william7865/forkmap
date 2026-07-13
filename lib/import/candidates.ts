// ============================================================
// lib/import/candidates.ts — turn a social post's caption into a ranked list of
// restaurant-name guesses. Pure, no network, fully testable.
//
// Food creators overwhelmingly mark the venue with a 📍 pin. That convention is
// the strongest signal there is — and the one a generic extractor misses.
// Everything else (chez X, capitalised runs, single proper nouns, the handle,
// hashtags) is a fallback, ranked below it.
//
// A wrong high-confidence guess is expensive: the resolver tries the first
// candidate first and would save the wrong restaurant. So every path goes
// through the same guards (stopwords, generic words) and noisy paths are
// demoted rather than dropped.
// ============================================================
import type { ImportCandidate } from '@/lib/import/parse'

export interface PlaceGuess {
  name: string
  /** City / area, when the caption gives one ("Le Train Bleu, Paris 12e"). */
  city: string | null
  /** 0–1. Drives which guess the resolver tries first. */
  confidence: number
}

/**
 * Pin-style markers creators use right before the venue name: 📍 📌 🏠.
 * Cutlery emojis (🍴 🍽) are decorative in food captions — no location intent —
 * so they are deliberately NOT markers.
 * (Escaped code points on purpose: literal emojis rot on copy/paste.)
 */
const PIN = /[\u{1F4CD}\u{1F4CC}\u{1F3E0}]/gu

/** Any pictographic char + variation selector / ZWJ / keycap, to scrub names. */
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu

/** Combining marks, for accent-insensitive comparison. */
const DIACRITICS = /[\u{0300}-\u{036F}]/gu

/** How much we trust each extraction path. */
const CONFIDENCE = {
  pin: 0.95,
  chez: 0.8,
  /** A capitalised run beats the handle: when a proper noun is in the caption,
   *  it is more likely the venue than the creator's own account name. */
  run: 0.65,
  handle: 0.6,
  /** Single proper nouns (Septime, Frenchie…) are real, but noisier. */
  word: 0.35,
  hashtag: 0.2,
} as const

/** Words that never name a venue on their own. */
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

/**
 * Words that can't start a venue name, so a capitalised run starting here is
 * noise ("Je Recommande", "Avec Thomas"). Pronouns / adverbs / prepositions
 * only — "Le", "La", "Les" are deliberately absent ("Le Train Bleu" is real,
 * and dropping it would cost more than the noise it removes).
 * Stored normalised (lowercase, no accent, straight apostrophe).
 */
const STOPWORDS = new Set([
  'je',
  "j'ai",
  'on',
  'nous',
  'il',
  'elle',
  'vous',
  'tu',
  'avec',
  'vu',
  'voici',
  'voila',
  "aujourd'hui",
  'hier',
  'demain',
  'enfin',
  'encore',
  'merci',
  'bref',
  'mon',
  'ma',
  'mes',
  'ce',
  'cette',
  'un',
  'une',
  // Superlatives that routinely open a caption ("Meilleur brunch de Paris…").
  'meilleur',
  'meilleure',
  // English captions are common on TikTok and open the same way.
  'this',
  'that',
  'these',
  'those',
  'we',
  'my',
  'best',
  'omg',
  'wow',
  'pov',
])

/** Trailing country of a postal address — never the city we want. */
const COUNTRIES = new Set([
  'france',
  'belgique',
  'suisse',
  'italie',
  'espagne',
  'portugal',
  'maroc',
  'japon',
])

/** Lowercase words allowed *between* two capitalised words of a name. */
const CONNECTORS = new Set(['de', 'du', 'des', 'le', 'la', 'les', "d'", "l'", 'a', 'aux', 'et'])

/** Lowercase, accent-free, straight apostrophes — the comparison form. */
function normalise(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS, '').replace(/[‘’]/g, "'").toLowerCase().trim()
}

function stripEmoji(s: string): string {
  return s.replace(EMOJI, ' ')
}

function clean(s: string): string {
  return stripEmoji(s)
    .replace(/[#@]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.\-–—:;!?]+|[\s,.\-–—:;!?]+$/g, '')
    .trim()
}

/** True when the whole name is made of generic words ("Paris", "TikTok France").
 *  A name that merely *contains* one survives ("Bistrot Paris 12"). */
function isGeneric(name: string): boolean {
  const words = normalise(name)
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
  if (words.length === 0) return true
  if (GENERIC.has(words.join(''))) return true
  return words.every((w) => GENERIC.has(w))
}

function isStopword(token: string): boolean {
  return STOPWORDS.has(normalise(token).replace(/[^a-z']/g, ''))
}

/** "Septime", "L'Ami", "D'Aubrac" — a word that can belong to a venue name. */
function isCapitalised(token: string): boolean {
  return /^[\p{Lu}]/u.test(token) || /^[dl]['’][\p{Lu}]/u.test(token)
}

/** "12", "12e", "12ème" — arrondissement numbers do live inside names. */
function isNumeric(token: string): boolean {
  return /^\d+(?:er|e|eme|ème)?$/u.test(token)
}

function isConnector(token: string): boolean {
  return CONNECTORS.has(normalise(token))
}

function tokenize(s: string): string[] {
  return clean(s).split(/\s+/).filter(Boolean)
}

/**
 * The "nominal head" of a chunk: the leading capitalised words, bridging a
 * lowercase connector between two capitalised words. Stops at the first
 * lowercase word that isn't a connector — that's where the caption goes back to
 * prose ("Septime rooftop incroyable la vue…" → "Septime").
 * Falls back to the first 4 words when nothing is capitalised (lowercase names).
 */
function nominalHead(chunk: string, fallback = true): string {
  const tokens = tokenize(chunk)
  const head: string[] = []
  const pending: string[] = []
  for (const tok of tokens) {
    if (isCapitalised(tok) || (head.length > 0 && isNumeric(tok))) {
      head.push(...pending.splice(0), tok)
    } else if (head.length > 0 && isConnector(tok)) {
      pending.push(tok) // kept only if another capitalised word follows
    } else {
      break
    }
  }
  if (head.length > 0) return head.join(' ')
  return fallback ? tokens.slice(0, 4).join(' ') : ''
}

/** "kodawari.ramen" → "kodawari ramen" */
function humanizeHandle(handle: string): string {
  return handle.replace(/[._]+/g, ' ').trim()
}

/**
 * Split a pin chunk into { name, city }.
 * The name is the nominal head of the first comma-separated segment. The city
 * is the first following segment that doesn't start with a digit (a street
 * number is not a city), ignoring a trailing country ("…, Paris, France").
 */
function splitNameCity(chunk: string): { name: string; city: string | null } {
  const segments = chunk.split(',').map(clean).filter(Boolean)
  const name = nominalHead(segments[0] ?? '')

  let rest = segments.slice(1)
  while (rest.length > 1 && COUNTRIES.has(normalise(rest[rest.length - 1])))
    rest = rest.slice(0, -1)
  const citySeg = rest.find((s) => !/^\d/.test(s))
  const city = citySeg ? nominalHead(citySeg) || citySeg : null

  return { name, city }
}

/**
 * Capitalised runs of the text ("Le Train Bleu") and isolated proper nouns
 * ("Septime"), kept apart because they don't deserve the same confidence.
 * Punctuation and emojis break a run. A run whose first word is a stopword is
 * dropped whole — "Avec Thomas" must not end up offering "Thomas".
 */
function capitalisedRuns(text: string): { multi: string[]; single: string[] } {
  const multi: string[] = []
  const single: string[] = []
  for (const chunk of stripEmoji(text).split(/[^\p{L}\p{N}'’\-\s]+/u)) {
    const tokens = chunk.split(/\s+/).filter(Boolean)
    const runs: string[][] = []
    let cur: string[] = []
    let pending: string[] = []
    for (const tok of tokens) {
      if (isCapitalised(tok)) {
        cur.push(...pending.splice(0), tok)
      } else if (cur.length > 0 && isConnector(tok)) {
        pending.push(tok)
      } else {
        if (cur.length > 0) runs.push(cur)
        cur = []
        pending = []
      }
    }
    if (cur.length > 0) runs.push(cur)

    for (const run of runs) {
      let words = run
      if (isStopword(words[0])) {
        // "Avec Thomas" / "Je Recommande": the capitalised word after a stopword
        // is a friend or a verb, never a venue → drop it. But "Aujourd'hui
        // Brasserie Lipp": two chained proper nouns after the stopword still
        // name a venue, so keep the tail in that case only.
        words = words.slice(1)
        if (words.length < 2) continue
      }
      const name = clean(words.join(' '))
      if (name.length < 4 || isGeneric(name)) continue
      if (words.length >= 2) multi.push(name)
      // A lone SHOUTED word ("INSANE", "TROP BON") is emphasis, not a venue.
      else if (name !== name.toUpperCase()) single.push(name)
    }
  }
  return { multi, single }
}

/**
 * The textual pin: "on est allé chez Bacchus" → "Bacchus".
 * A capitalised "Chez" usually belongs to the venue name ("Chez Aline"), a
 * lowercase one is just the preposition — hence the two shapes.
 */
function chezMatches(text: string): string[] {
  const out: string[] = []
  for (const m of stripEmoji(text).matchAll(/\b(chez)\s+([^\n,.!?•|]{2,60})/giu)) {
    const head = nominalHead(m[2], false) // no lowercase fallback: "chez moi"
    if (head.length < 3 || isStopword(head.split(' ')[0]) || isGeneric(head)) continue
    const capitalised = /^[\p{Lu}]/u.test(m[1])
    out.push(capitalised ? `${m[1]} ${head}` : head)
  }
  return out
}

/**
 * Rank restaurant-name guesses from a parsed post.
 * Ordered by confidence, deduped (case-insensitive), never empty-named.
 */
export function extractPlaceCandidates(post: ImportCandidate): PlaceGuess[] {
  const text = `${post.title} ${post.description}`.trim()
  const out: PlaceGuess[] = []

  // 1. The pin markers — the strongest signal. A caption often holds several
  //    ("mes 3 adresses"), so every pin yields its own candidate and its chunk
  //    stops at the next pin.
  const pins = [...text.matchAll(PIN)]
  pins.forEach((pin, i) => {
    const start = (pin.index ?? 0) + pin[0].length
    const end = i + 1 < pins.length ? (pins[i + 1].index ?? text.length) : text.length
    const chunk = text.slice(start, end).split(/[\n•|]|(?:\s[-–—]\s)/)[0] ?? ''
    const { name, city } = splitNameCity(chunk)
    if (name.length >= 2 && !isStopword(name.split(' ')[0]) && !isGeneric(name)) {
      out.push({ name, city, confidence: CONFIDENCE.pin })
    }
  })

  // 2. "chez <Nom>" — the textual equivalent of a pin.
  for (const name of chezMatches(text)) {
    out.push({ name, city: null, confidence: CONFIDENCE.chez })
  }

  const { multi, single } = capitalisedRuns(text)

  // 3. Capitalised runs in the caption — the narrative case, above the handle.
  for (const name of multi) out.push({ name, city: null, confidence: CONFIDENCE.run })

  // 4. The account handle — food venues often post from their own account.
  if (post.handle) {
    const name = humanizeHandle(post.handle)
    if (name.length >= 3 && !isGeneric(name)) {
      out.push({ name, city: null, confidence: CONFIDENCE.handle })
    }
  }

  // 5. Single proper nouns (Septime, Frenchie, Clover…) — low confidence so they
  //    never drown a better guess, but the only way to catch one-word venues.
  for (const name of single) out.push({ name, city: null, confidence: CONFIDENCE.word })

  // 6. Non-generic hashtags, last resort.
  for (const tag of post.hashtags) {
    if (!isGeneric(tag) && tag.length >= 4) {
      out.push({ name: tag, city: null, confidence: CONFIDENCE.hashtag })
    }
  }

  // Dedupe (case-insensitive), keep the highest confidence, sort desc.
  const best = new Map<string, PlaceGuess>()
  for (const g of out) {
    const key = normalise(g.name)
    const prev = best.get(key)
    if (!prev || g.confidence > prev.confidence) {
      best.set(key, { ...g, city: g.city ?? prev?.city ?? null })
    }
  }
  return [...best.values()].sort((a, b) => b.confidence - a.confidence)
}
