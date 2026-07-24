// ============================================================
// lib/import/candidates.ts — turn a social post's caption into a ranked list of
// restaurant-name guesses. Pure, no network, fully testable.
//
// Food creators overwhelmingly mark the venue with a 📍 pin. That convention is
// the strongest signal there is — and the one a generic extractor misses.
// Everything else (chez X, capitalised runs, single proper nouns, the handle,
// hashtags) is a fallback, ranked below it.
//
// Downstream, a confidence gate only accepts a Google result that closely
// matches the guess: a wrong guess degrades into "à confirmer", it never saves
// the wrong restaurant. A *missing* guess costs exactly as much (the user has to
// step in either way). So the rule here is: never drop a true positive to kill a
// false one — narrow the false one instead.
//
// The one real trap is capitalisation. It is the backbone of the narrative path
// ("Le Train Bleu"), and it carries *no information at all* in the two styles
// creators actually write in: ALL CAPS and all lowercase. Both are detected and
// routed to a case-blind extractor instead of being fed to the run scanner.
// ============================================================
import type { ImportCandidate } from '@/lib/import/parse'
import type { LocationTag } from '@/lib/import/location'

export interface PlaceGuess {
  name: string
  /** City / area, when the caption gives one ("Le Train Bleu, Paris 12e"). */
  city: string | null
  /** 0–1. Drives which guess the resolver tries first. */
  confidence: number
  /** Coordinates, when the guess came from a geotag — the resolver's fast path. */
  lat?: number | null
  lon?: number | null
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

/** Splits prose into segments: any punctuation, and the bullets creators use. */
const SEGMENT_SPLIT = /[^\p{L}\p{N}'’\-\s]+/u

/** How much we trust each extraction path. */
const CONFIDENCE = {
  pin: 0.95,
  /** "<Name>, 12 rue X, Paris" — a name pinned to a street address is nearly as
   *  certain as an explicit 📍, and it beats the posting account. */
  address: 0.9,
  chez: 0.8,
  /** The posting account's display name ("SUSHIWAN sur Instagram: …"). For a
   *  venue account this IS the place — a strong signal, on par with a chez pin,
   *  but still below an explicit 📍 in the caption. */
  account: 0.8,
  /** A capitalised run beats the handle: when a proper noun is in the caption,
   *  it is more likely the venue than the creator's own account name. */
  run: 0.65,
  /** An @mention in the caption — in food content, usually the venue's account
   *  ("grâce à @bouillon.pigalle"). On par with the posting handle. */
  mention: 0.6,
  handle: 0.6,
  /** Single proper nouns (Septime, Frenchie…) are real, but noisier. */
  word: 0.35,
  hashtag: 0.2,
} as const

/** Cities we can recognise — used to split "Septime Paris" into name + city. */
const CITIES = new Set([
  'paris',
  'lyon',
  'marseille',
  'bordeaux',
  'lille',
  'toulouse',
  'nantes',
  'nice',
  'strasbourg',
  'montpellier',
  'rennes',
  'bruxelles',
])

/**
 * Words that never name a venue *on their own*. A name that merely contains one
 * survives ("Bistrot Paris 12"), so this list can be generous with the words
 * that fill French food captions ("Nouvelle Adresse Préférée" is all noise).
 */
const GENERIC = new Set([
  ...CITIES,
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
  'adresses',
  'cuisine',
  'chef',
  // Caption filler that gets Title-Cased and pretends to be a name.
  'meilleur',
  'meilleure',
  'meilleurs',
  'meilleures',
  'nouveau',
  'nouvelle',
  'prefere',
  'preferee',
  'preferes',
  'preferees',
  'spot',
  'pepite',
  'endroit',
  'decouverte',
])

/**
 * Words that can't start a venue name, so a capitalised run starting here is
 * noise ("Je Recommande", "Avec Thomas", "Notre Nouvelle Adresse").
 *
 * Kept deliberately short: only what can NEVER open a shop sign. "Le/La/Les",
 * "Un/Une" and the English "Best/My/This" all open real names ("Le Train Bleu",
 * "Best Bagel", "My Little Kitchen") — banning them destroyed true positives.
 * Filler like "Meilleur" belongs in GENERIC instead, where it only kills a name
 * made *entirely* of filler.
 * Stored normalised (lowercase, no accent, straight apostrophe).
 */
const STOPWORDS = new Set([
  'je',
  "j'ai",
  'on',
  'nous',
  'notre',
  'nos',
  'mon',
  'ma',
  'mes',
  'ce',
  'cette',
  'vous',
  'tu',
  'il',
  'elle',
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
  'omg',
  'wow',
  'pov',
])

/**
 * Prose words a venue name never runs through. Used by the *case-blind* head
 * extractor (`plainHead`), which has no capitalisation to lean on and needs a
 * different way to know where the name ends ("chez bacchus hier soir").
 * Articles (le/la/les/du/de/des/l') are absent on purpose: they live inside real
 * names ("Chez la Vieille", "Le Comptoir du Relais").
 */
const PROSE_STOP = new Set([
  ...STOPWORDS,
  // pronouns / determiners
  'ils',
  'elles',
  'moi',
  'toi',
  'lui',
  'eux',
  'soi',
  'cet',
  'ces',
  'ton',
  'ta',
  'tes',
  'son',
  'sa',
  'ses',
  'votre',
  'vos',
  'leur',
  'leurs',
  'qui',
  'que',
  'quoi',
  // verbs / auxiliaries
  'est',
  "c'est",
  "c'etait",
  'etait',
  'sont',
  'etre',
  'ete',
  'ai',
  'as',
  'ont',
  'avait',
  'avais',
  'suis',
  'sommes',
  'va',
  'vais',
  'fait',
  'faire',
  'mange',
  'manger',
  'teste',
  'adore',
  'recommande',
  'trouve',
  'decouvert',
  'alle',
  'allee',
  // connectors / prepositions
  'et',
  'ou',
  'mais',
  'donc',
  'car',
  'ni',
  'puis',
  'ensuite',
  'alors',
  'aussi',
  'comme',
  'quand',
  'si',
  'pour',
  'par',
  'sans',
  'sous',
  'sur',
  'dans',
  'apres',
  'avant',
  'depuis',
  'entre',
  'vers',
  'chez',
  'au',
  'aux',
  'a',
  // intensifiers / adjectives
  'tres',
  'trop',
  'plus',
  'moins',
  'tout',
  'tous',
  'toute',
  'toutes',
  'jamais',
  'toujours',
  'vraiment',
  'franchement',
  'honnetement',
  'perso',
  'juste',
  'meme',
  'deja',
  'bon',
  'bonne',
  'bien',
  'super',
  'genial',
  'geniale',
  'incroyable',
  'dingue',
  'fou',
  'folle',
  'top',
  'excellent',
  'delicieux',
  'parfait',
  'sympa',
  'magique',
  'magnifique',
  'tuerie',
  'ouf',
  'mortel',
  'cache',
  'cachee',
  // time
  'soir',
  'soiree',
  'matin',
  'midi',
  'weekend',
  'semaine',
  'jour',
  'fois',
  // common English prose
  'is',
  'are',
  'was',
  'and',
  'so',
  'very',
  'really',
  'insane',
])

/**
 * "chez moi" and friends: the only shapes where "chez" is followed by a person,
 * not a venue. Explicit list — anything else after "chez" is a name candidate,
 * whatever its case.
 */
const CHEZ_EXCLUDE = new Set(['moi', 'toi', 'nous', 'eux', 'lui', 'elle', 'soi', 'vous'])

/**
 * Imperative call-to-action verbs that open a caption sentence right before the
 * venue name ("Découvrez Onyx", "Testez ce spot", "Réservez votre table").
 * Capitalised by sentence-start, so the run scanner would glue them onto the name
 * — they are stripped, and a run made only of them is dropped (isFiller).
 * Stored normalised (lowercase, no accent).
 */
const CTA_VERBS = new Set([
  'decouvrez',
  'decouvre',
  'decouvrir',
  'testez',
  'teste',
  'tester',
  'goutez',
  'goute',
  'gouter',
  'essayez',
  'essaye',
  'essayer',
  'reservez',
  'reserve',
  'reserver',
  'foncez',
  'fonce',
  'courez',
  'allez',
  'visitez',
  'notez',
  'retrouvez',
  'filez',
  'direction',
])

function isCtaVerb(token: string): boolean {
  return CTA_VERBS.has(key(token))
}

/**
 * Words that mark a food GUIDE / curator account, never a venue's own name
 * ("Guide Restoaparis", "parisfoodie", "bestrestos"). A curator account posts
 * ABOUT restaurants — trusting it as the place short-circuits resolution onto the
 * wrong venue. Deliberately strong-only markers: "resto/paris/food" are too common
 * in real venue names and are handled by stripBrandSuffix instead.
 */
const CURATOR_MARKERS = new Set([
  'guide',
  'guides',
  'blog',
  'blogueur',
  'blogueuse',
  'foodie',
  'foodies',
  'addict',
  'addicts',
  'lover',
  'lovers',
  'best',
  'top',
  'tips',
  'bonplan',
  'bonsplans',
  'bonneadresse',
  'bonnesadresses',
  'review',
  'reviews',
  'insta',
  'media',
  'foodporn',
  'foodguide',
  'foodstagram',
  'tastemaker',
  'critique',
])

/** True when a name looks like a food guide/curator, not a venue. Splits on dots
 *  and underscores too, so a separated handle ("paris.foodie") is caught. */
function isCurator(name: string): boolean {
  return normalise(name)
    .split(/[\s._]+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .some((w) => CURATOR_MARKERS.has(w))
}

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

/**
 * Lowercase words allowed *between* two capitalised words of a name.
 * "et" and "à" are deliberately absent: they join two *different* venues
 * ("Septime et Clover", "Nouveau Spot à Paris"), they never sit inside one.
 */
const CONNECTORS = new Set(['de', 'du', 'des', 'le', 'la', 'les', "d'", "l'", 'aux'])

/** A street line, never a city: "10 rue de Charonne", "3 bd Voltaire". */
const STREET =
  /^\d{1,3}\s*(?:bis|ter)?\s+(?:rue|av|ave|avenue|bd|boulevard|blvd|place|pl|quai|impasse|allee|allée|chemin|route|cours|faubourg|passage|square)\b/iu

/** A postal line: the city is what follows the code ("75011 Paris"). */
const POSTAL = /^\d{4,5}\s+(.+)$/u

/** Lowercase, accent-free, straight apostrophes — the comparison form. */
function normalise(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS, '').replace(/[‘’]/g, "'").toLowerCase().trim()
}

/** Comparison key of a single token: normalised, punctuation-free. */
function key(token: string): string {
  return normalise(token).replace(/[^a-z0-9']/g, '')
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
  let words = normalise(name)
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
  if (words.length === 0) return true
  if (GENERIC.has(words.join(''))) return true
  // A generic word plus a number is an arrondissement, not a venue ("Paris 11").
  // The number only *belongs* to a name that has a non-generic word too
  // ("Bistrot Paris 12", "Holybelly 5"), so strip it before the verdict.
  while (words.length > 1 && isNumeric(words[words.length - 1])) words = words.slice(0, -1)
  return words.every((w) => GENERIC.has(w))
}

/**
 * A run made only of prose and filler is emphasis, never a shop sign
 * ("TROP BON", "Je Recommande", "Meilleur Spot"). Case-blind on purpose: it is
 * what tells an ALL-CAPS venue name ("SEPTIME") from an ALL-CAPS shout
 * ("INSANE"), where the previous "a lone uppercase word is never a venue" rule
 * threw both away.
 */
function isFiller(words: string[]): boolean {
  return words.every((w) => {
    const k = key(w)
    return !k || PROSE_STOP.has(k) || GENERIC.has(k) || CTA_VERBS.has(k)
  })
}

function isStopword(token: string): boolean {
  return STOPWORDS.has(normalise(token).replace(/[^a-z']/g, ''))
}

/** "Septime", "L'Ami", "D'Aubrac" — a word that can belong to a venue name. */
function isCapitalised(token: string): boolean {
  return /^[\p{Lu}]/u.test(token) || /^[dl]['’][\p{Lu}]/u.test(token)
}

/** "12", "12e", "12ème", "47" — numbers do live inside and at the end of names. */
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
 * "<n> restaurants", "13 adresses", "5 spots" — an enumeration a creator drops
 * behind a 📍 ("📍 13 restaurants en IDF") to mean "several branches", NOT a
 * venue name. Narrow on purpose: only a leading count + a plural collective word,
 * so real number-led signs ("3 Brasseurs", "Le 404") are untouched.
 */
function isCountPhrase(name: string): boolean {
  return /^\d+\s+(?:restaurants?|restos?|adresses?|spots?|pepites?|lieux|endroits?|enseignes?|succursales?)\b/iu.test(
    normalise(name)
  )
}

/**
 * A SHOUTED segment: ≥ 3 words and ≥ 80 % of its letters are uppercase.
 * There, "starts with a capital" is true of *every* word, so the run scanner
 * would happily return the whole sentence as a venue name. Capitalisation
 * carries no information here and must not be read as one.
 */
function isShouted(segment: string): boolean {
  const words = segment.trim().split(/\s+/).filter(Boolean)
  if (words.length < 3) return false
  const letters = segment.match(/\p{L}/gu)
  if (!letters || letters.length < 3) return false
  const upper = letters.filter((l) => l !== l.toLowerCase() && l === l.toUpperCase())
  return upper.length / letters.length >= 0.8
}

/**
 * Case-blind head: keep taking words while they *could* belong to a name, i.e.
 * they are neither prose nor filler. This is the only way to read a name out of
 * a SHOUTED or an all-lowercase caption ("chez bacchus hier soir" → "bacchus").
 * Bounded (default 3 words) because with no case signal, the longer we run, the
 * more likely we are swallowing the sentence.
 */
function plainHead(tokens: string[], max = 3): string {
  const head: string[] = []
  for (const tok of tokens) {
    const k = key(tok)
    if (!k) break
    if (head.length >= max) break
    if (PROSE_STOP.has(k) || GENERIC.has(k)) break
    head.push(tok)
  }
  return head.join(' ')
}

/**
 * The "nominal head" of a chunk: the leading capitalised words, bridging a
 * lowercase connector between two capitalised words. Stops at the first
 * lowercase word that isn't a connector — that's where the caption goes back to
 * prose ("Septime rooftop incroyable la vue…" → "Septime").
 * When there is no usable case signal (SHOUTED chunk, or nothing capitalised at
 * all), falls back to the case-blind head.
 */
function nominalHead(chunk: string, fallback = true): string {
  let tokens = tokenize(chunk)
  // "Découvrez Onyx" → drop the leading CTA verb, keep the name.
  while (tokens.length >= 2 && isCtaVerb(tokens[0])) tokens = tokens.slice(1)
  if (isShouted(chunk)) return fallback ? plainHead(tokens, 4) : ''

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
  return fallback ? plainHead(tokens, 4) : ''
}

/** "kodawari.ramen" → "kodawari ramen" */
function humanizeHandle(handle: string): string {
  return handle.replace(/[._]+/g, ' ').trim()
}

/**
 * Generic brand suffixes creators glue onto an account name / handle: country,
 * city, "official", "resto"… — none of them belong to the sign over the door
 * ("sushiwanfrance" → "sushiwan", "bistrot.officiel" → "bistrot", "lami_off" →
 * "lami"). Kept as a small closed list on purpose: it must never eat a real word.
 * "off"/"fr"/"resto" are cleaned only when SEPARATED (a `.fr`/`_off` token),
 * never glued, where they would maul short names.
 */
const BRAND_SUFFIX = new Set([
  'officiel',
  'official',
  'restaurant',
  'resto',
  'france',
  'paris',
  'off',
  'fr',
])
/** Suffixes safe to strip even when glued (no separator) to a longer stem. */
const GLUED_SUFFIX = ['officiel', 'official', 'restaurant', 'france', 'paris']

/**
 * Strip a trailing brand suffix from an account name or handle.
 * Separator-attached suffixes (`sushiwan.france`, `lami_off`, `bistrot.fr`)
 * split off as their own token; a glued country/label (`sushiwanfrance`) is
 * peeled only when a real stem (≥ 4 chars) survives. Never returns empty.
 */
function stripBrandSuffix(raw: string): string {
  let tokens = raw.replace(/[._]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return raw.trim()
  // Drop trailing suffix tokens ("sushiwan france", "lami off"), but never the
  // last surviving word.
  while (tokens.length > 1 && BRAND_SUFFIX.has(normalise(tokens[tokens.length - 1]))) {
    tokens = tokens.slice(0, -1)
  }
  // Peel a glued suffix off the final token ("sushiwanfrance" → "sushiwan").
  const last = tokens[tokens.length - 1]
  const k = normalise(last)
  for (const suf of GLUED_SUFFIX) {
    if (k.length > suf.length + 3 && k.endsWith(suf)) {
      tokens[tokens.length - 1] = last.slice(0, last.length - suf.length)
      break
    }
  }
  const out = tokens.join(' ').trim()
  return out.length > 0 ? out : raw.trim()
}

/**
 * "Septime 🔥🔥 Paris" → { name: "Septime", city: "Paris" }.
 * Without a comma, the head swallows the city sitting right after the name.
 * Only fires when the name keeps at least one word.
 */
function detachCity(name: string): { name: string; city: string | null } {
  const words = name.split(' ')
  if (words.length < 2) return { name, city: null }
  const last = words[words.length - 1]
  if (!CITIES.has(key(last))) return { name, city: null }
  return { name: words.slice(0, -1).join(' '), city: last }
}

/**
 * Split a pin chunk into { name, city }.
 * The name is the nominal head of the first comma-separated segment. The city is
 * the first following segment that is not a street line, ignoring a trailing
 * country ("…, Paris, France"). A postal line keeps its tail ("75011 Paris" →
 * "Paris"): dropping every digit-leading segment threw the city away with it.
 */
function splitNameCity(chunk: string): { name: string; city: string | null } {
  const segments = chunk.split(',').map(clean).filter(Boolean)
  const head = nominalHead(segments[0] ?? '')

  let rest = segments.slice(1)
  while (rest.length > 1 && COUNTRIES.has(normalise(rest[rest.length - 1])))
    rest = rest.slice(0, -1)

  let city: string | null = null
  for (const seg of rest) {
    if (STREET.test(seg)) continue
    const postal = POSTAL.exec(seg)
    if (postal) {
      const tail = clean(postal[1])
      if (tail && !/^\d/.test(tail)) {
        city = nominalHead(tail) || tail
        break
      }
      continue
    }
    if (/^\d/.test(seg)) continue // a street number is not a city
    city = nominalHead(seg) || seg
    break
  }

  if (city) return { name: head, city }
  return detachCity(head)
}

/**
 * Capitalised runs of the text ("Le Train Bleu") and isolated proper nouns
 * ("Septime"), kept apart because they don't deserve the same confidence.
 * Punctuation and emojis break a run. SHOUTED segments yield nothing: there,
 * every word looks capitalised, so a run would be the whole sentence.
 * A run whose first word is a stopword drops that word — "Avec Thomas" must not
 * offer "Thomas", but "Voici Le Train Bleu" must still offer the venue.
 */
/**
 * Valid capitalised-run names within ONE chunk, in reading order (with word
 * counts). A run whose first word is a CTA verb ("Découvrez Onyx") drops it and
 * keeps the name; a run whose first word is a stopword ("Avec Thomas") drops it
 * and keeps a ≥2-word tail; filler / generic / too-short runs are discarded.
 * SHOUTED chunks yield nothing.
 */
function runsIn(chunk: string): { name: string; words: string[] }[] {
  if (isShouted(chunk)) return []
  const tokens = chunk.split(/\s+/).filter(Boolean)
  const runs: string[][] = []
  let cur: string[] = []
  let pending: string[] = []
  for (const tok of tokens) {
    if (isCapitalised(tok) || (cur.length > 0 && isNumeric(tok))) {
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

  const out: { name: string; words: string[] }[] = []
  for (const run of runs) {
    let words = run
    // "Découvrez Onyx" → drop the leading CTA verb, keep the name.
    while (words.length >= 2 && isCtaVerb(words[0])) words = words.slice(1)
    if (isStopword(words[0])) {
      // "Avec Thomas" / "Je Recommande": the capitalised word after a stopword
      // is a friend or a verb, never a venue → drop it. But "Aujourd'hui
      // Brasserie Lipp": two chained proper nouns after the stopword still name a
      // venue, so keep the tail in that case only.
      words = words.slice(1)
      if (words.length < 2) continue
    }
    const name = clean(words.join(' '))
    if (name.length < 4 || isGeneric(name) || isFiller(words)) continue
    out.push({ name, words })
  }
  return out
}

/**
 * Capitalised runs of the text ("Le Train Bleu") and isolated proper nouns
 * ("Septime"), kept apart because they don't deserve the same confidence.
 * Punctuation and emojis break a run.
 */
function capitalisedRuns(text: string): { multi: string[]; single: string[] } {
  const multi: string[] = []
  const single: string[] = []
  for (const chunk of stripEmoji(text).split(SEGMENT_SPLIT)) {
    for (const { name, words } of runsIn(chunk)) {
      if (words.length >= 2) multi.push(name)
      else single.push(name)
    }
  }
  return { multi, single }
}

/** The LAST capitalised-run name of a chunk — the venue that sits right before an
 *  address ("…cadre chic. Découvrez Onyx" → "Onyx"). '' when there is none. */
function trailingName(chunk: string): string {
  const runs = runsIn(chunk)
  return runs.length ? runs[runs.length - 1].name : ''
}

/**
 * "<Name>, 12 rue X, Paris" — a venue pinned to a street address, as strong a
 * signal as an explicit 📍. The name is the trailing capitalised run of the
 * segment BEFORE the street line; the city is the first following non-street
 * segment. Splitting on '.' too lets it read a name mid-sentence
 * ("…chic. Découvrez Onyx, 71 rue de Provence, Paris").
 */
function addressMatches(text: string): PlaceGuess[] {
  const out: PlaceGuess[] = []
  const segments = stripEmoji(text)
    .split(/[,\n•|.]/)
    .map(clean)
    .filter(Boolean)
  for (let i = 1; i < segments.length; i++) {
    if (!STREET.test(segments[i])) continue
    const name = trailingName(segments[i - 1])
    if (name.length < 3 || isStopword(name.split(' ')[0]) || isGeneric(name) || isCurator(name)) {
      continue
    }
    let city: string | null = null
    for (let j = i + 1; j < segments.length; j++) {
      const seg = segments[j]
      if (STREET.test(seg) || COUNTRIES.has(normalise(seg))) continue
      const postal = POSTAL.exec(seg)
      if (postal) {
        const tail = clean(postal[1])
        if (tail && !/^\d/.test(tail)) {
          city = nominalHead(tail) || tail
          break
        }
        continue
      }
      if (/^\d/.test(seg)) continue
      city = nominalHead(seg) || seg
      break
    }
    out.push({ name, city, confidence: CONFIDENCE.address })
  }
  return out
}

/**
 * The textual pin: "on est allé chez Bacchus" → "Bacchus".
 * Case-blind on purpose — a huge share of creators type without capitals, and
 * the previous shape ("the word after chez must start with a capital") simply
 * returned nothing for them. The name is bounded by `plainHead` (prose word,
 * filler or punctuation ends it) and by the explicit "chez moi/toi/nous…" list.
 * A capitalised "Chez" in normal prose belongs to the name itself ("Chez Aline")
 * — but in a SHOUTED segment its case means nothing, so it is dropped.
 */
function chezMatches(text: string): PlaceGuess[] {
  const out: PlaceGuess[] = []
  for (const segment of stripEmoji(text).split(SEGMENT_SPLIT)) {
    const shouted = isShouted(segment)
    for (const m of segment.matchAll(/(^|\s)(chez)\s+(.+)$/giu)) {
      const tokens = tokenize(m[3])
      if (tokens.length === 0) continue
      if (CHEZ_EXCLUDE.has(key(tokens[0]))) continue
      const head = plainHead(tokens, 3)
      if (head.length < 3 || isStopword(head.split(' ')[0]) || isGeneric(head)) continue
      const owned = !shouted && /^[\p{Lu}]/u.test(m[2])
      const split = detachCity(head)
      // "chez @sphere.restaurant.paris" → the target is a handle; humanise it and
      // strip the brand suffix so it searches as "sphere", not "sphere.restaurant.paris".
      const cleaned = /\./.test(split.name)
        ? stripBrandSuffix(humanizeHandle(split.name))
        : split.name
      out.push({
        name: owned ? `${m[2]} ${cleaned}` : cleaned,
        city: split.city,
        confidence: CONFIDENCE.chez,
      })
    }
  }

  // "chez @sphere.restaurant.paris" — the @ is a segment break above, so the loop
  // misses it. Catch the handle form on the full text: "chez @<handle>" is the
  // strongest phrasing ("at X's place"), so it keeps the chez confidence.
  for (const m of stripEmoji(text).matchAll(/\bchez\s+@([a-zA-Z0-9._]{2,40})/giu)) {
    const name = stripBrandSuffix(humanizeHandle(m[1]))
    if (name.length >= 3 && !isGeneric(name) && !isCurator(name)) {
      out.push({ name, city: null, confidence: CONFIDENCE.chez })
    }
  }
  return out
}

// ── Multi-venue list posts ────────────────────────────────
// "5 addresses in Paris: – Melané @melane_paris — Gloria Osteria @gloriaosteria …"
// A single post that lists several venues, each on its own line as "<Name> @handle".

export interface VenueEntry {
  name: string
  handle: string | null
}

/** A line that introduces one venue: an optional bullet, a name, then its @handle. */
const VENUE_LINE = /^[\s–—\-•*·>#0-9.)]*\s*(.{1,60}?)\s+@([a-zA-Z0-9._]{2,40})\b/
/** A real list bullet at the very start of the line. */
const BULLET_START = /^\s*[–—\-•*·]/

/**
 * Detect a list-style caption and return its venues in order, each a name paired
 * with its @handle. The name is the trailing capitalised run before the handle,
 * falling back to the humanised handle when the text name isn't a clean venue.
 * Curator/prose lines ("merci @ami") are dropped. Deduped. A caller treats
 * length ≥ 3 as "this is a list".
 */
export function extractVenueList(caption: string): VenueEntry[] {
  const out: VenueEntry[] = []
  const seen = new Set<string>()
  for (const line of caption.split('\n')) {
    const m = VENUE_LINE.exec(line)
    if (!m) continue
    const handle = m[2].replace(/[._]+$/, '')
    if (isCurator(handle)) continue
    let name = trailingName(m[1])
    const validText =
      !!name && !isStopword(name.split(' ')[0]) && !isGeneric(name) && !isCurator(name)
    if (!validText) {
      // No clean venue name before the @. Only trust the handle as the venue when
      // the line is an actual list item (a bullet) — otherwise it's a prose
      // mention ("merci @mon_ami"), not a venue.
      if (!BULLET_START.test(line)) continue
      name = stripBrandSuffix(humanizeHandle(handle))
    }
    if (name.length < 2 || isGeneric(name) || isCurator(name)) continue
    const key = normalise(name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ name, handle })
  }
  return out
}

/** A human title for a list import — the first substantive caption line (skips the
 *  poster handle, venue lines and hashtag piles). Capped; falls back to "Adresses". */
export function listTitle(caption: string): string {
  for (const raw of caption.split('\n')) {
    const line = raw.trim()
    if (line.includes(' ') && line.length >= 12 && !line.includes('@') && !line.startsWith('#')) {
      return line.replace(/\s+/g, ' ').slice(0, 80).trim()
    }
  }
  return 'Adresses'
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
    if (
      name.length >= 2 &&
      !isStopword(name.split(' ')[0]) &&
      !isGeneric(name) &&
      !isCountPhrase(name) &&
      // "📍 18, rue la Boétie" points at an ADDRESS, not a name — a bare number or
      // a street fragment must not become a 0.95 candidate ("3 Brasseurs" survives).
      !isNumeric(name) &&
      !STREET.test(name)
    ) {
      out.push({ name, city, confidence: CONFIDENCE.pin })
    }
  })

  // 1bis. "<Name>, 12 rue X, Paris" — a name pinned to a street address. As strong
  //        as a 📍, and crucially it beats a posting account (so a food guide that
  //        writes "Découvrez Onyx, 71 rue de Provence" resolves to Onyx, not the guide).
  out.push(...addressMatches(text))

  // 2. "chez <Nom>" — the textual equivalent of a pin.
  out.push(...chezMatches(text))

  const { multi, single } = capitalisedRuns(text)

  // 2bis. The posting account's display name ("SUSHIWAN sur Instagram: …"). For a
  //       venue account this IS the place — but a food GUIDE/curator account posts
  //       ABOUT restaurants, so trusting it resolves onto the wrong venue: skip those.
  if (post.account && !isCurator(post.account)) {
    const name = stripBrandSuffix(post.account)
    if (name.length >= 3 && !isGeneric(name)) {
      out.push({ name, city: null, confidence: CONFIDENCE.account })
    }
  }

  // 3. Capitalised runs in the caption — the narrative case, above the handle.
  for (const name of multi) out.push({ name, city: null, confidence: CONFIDENCE.run })

  // 4. The account handle — food venues often post from their own account.
  //    Brand suffix stripped too ("sushiwanfrance" → "sushiwan"). A curator handle
  //    ("parisfoodguide") is skipped, like the curator account above.
  if (post.handle && !isCurator(post.handle)) {
    const name = stripBrandSuffix(humanizeHandle(post.handle))
    if (name.length >= 3 && !isGeneric(name)) {
      out.push({ name, city: null, confidence: CONFIDENCE.handle })
    }
  }

  // 4bis. @mentions in the caption — when a third party credits the venue's own
  //       account ("grâce à @bouillon.pigalle"), that mention IS the restaurant.
  for (const mention of post.mentions ?? []) {
    if (isCurator(mention)) continue
    const name = stripBrandSuffix(humanizeHandle(mention))
    if (name.length >= 3 && !isGeneric(name)) {
      out.push({ name, city: null, confidence: CONFIDENCE.mention })
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
    const k = normalise(g.name)
    const prev = best.get(k)
    if (!prev || g.confidence > prev.confidence) {
      best.set(k, { ...g, city: g.city ?? prev?.city ?? null })
    }
  }
  return [...best.values()].sort((a, b) => b.confidence - a.confidence)
}

// ── Signal fusion ─────────────────────────────────────────
// The caption is one signal. On-screen text (OCR of the thumbnail) and the post's
// geotag are two more — the same venue named a different way. fuseCandidates runs
// each through the SAME extractor, then rewards agreement: a name confirmed by
// more than one source is likelier the real venue.

/** UI chrome an OCR pass reads off a reel's overlay — never part of a venue name. */
const OCR_NOISE = new Set([
  'menu',
  'carte',
  'ouvert',
  'ferme',
  'fermee',
  'avis',
  'note',
  'reservation',
  'reserver',
  'commander',
  'livraison',
  'adresse',
  'horaires',
  'tel',
  'telephone',
  'prix',
  'euro',
  'euros',
  'abonne',
  'abonnez',
  'follow',
  'like',
  'partage',
  'partager',
])

/**
 * Turn raw OCR lines into clean text for the extractor. On-screen overlays carry
 * the venue name AND clutter — prices, a rating, a duration, a handle, "OUVERT",
 * "MENU". Those lines form spurious capitalised runs, so they're dropped before
 * the text ever reaches extractPlaceCandidates. Pure, testable.
 */
export function cleanOcrText(lines: string[]): string {
  return lines
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length < 2) return false
      // Pure numbers / prices / ratings / symbols ("12€", "★ 9.0", "4,8/5").
      if (/^[\d\s.,:€$£★☆%/+\-–—()]+$/u.test(l)) return false
      // A leading count + unit ("12 min", "3 km", "1.2k avis").
      if (/^\d[\d.,\s]*\s*(?:min|mins|km|m|h|€|euros?|avis|reviews?|k|abonn)/iu.test(l))
        return false
      // A lone @handle or #hashtag.
      if (/^[@#][\p{L}0-9_.]+$/u.test(l)) return false
      // A line made only of UI-chrome words.
      const words = normalise(l)
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z0-9]/g, ''))
        .filter(Boolean)
      if (words.length > 0 && words.every((w) => OCR_NOISE.has(w))) return false
      return true
    })
    .join('\n')
}

export interface FuseInput {
  post: ImportCandidate
  /** Text read off the thumbnail (native OCR). Noisier than the caption. */
  ocrText?: string | null
  /** The venue the creator tagged, from lib/import/location.ts. */
  location?: LocationTag | null
}

/** On-screen text is noisier than a caption, so an OCR guess never outranks a
 *  clean caption pin — its confidence is capped here. */
const OCR_CAP = 0.6
/** A geotag WITH coordinates is near-certain; name-only is still very strong. */
const LOCATION_WITH_COORDS = 0.97
const LOCATION_NAME_ONLY = 0.85
/** Confirmation bonus when ≥2 distinct sources name the same venue. */
const CROSS_BOOST = 0.12

/**
 * Merge the caption, OCR and geotag into one ranked guess list.
 * - Each source is extracted with the existing heuristics (OCR through a
 *   synthetic post so it reuses pins / runs / proper-noun detection).
 * - Guesses are deduped by normalised name; a name seen from ≥2 sources gets a
 *   confidence boost (cross-validation).
 * - A geotag carries its coordinates onto its guess, giving the resolver a fast,
 *   proximity-based path (see resolve.ts).
 */
export function fuseCandidates({ post, ocrText, location }: FuseInput): PlaceGuess[] {
  const raw: (PlaceGuess & { source: string })[] = []

  for (const g of extractPlaceCandidates(post)) raw.push({ ...g, source: 'caption' })

  const ocr = (ocrText ?? '').trim()
  if (ocr) {
    const synth: ImportCandidate = {
      platform: post.platform,
      handle: null,
      account: null,
      title: '',
      description: ocr,
      hashtags: [],
      query: '',
    }
    for (const g of extractPlaceCandidates(synth)) {
      raw.push({ ...g, confidence: Math.min(g.confidence, OCR_CAP), source: 'ocr' })
    }
  }

  // A geotag names the venue — unless it's a city/area ("Paris"), which would
  // resolve to a point, not a restaurant. isGeneric drops those.
  if (location?.name && !isGeneric(location.name)) {
    const hasCoords = location.lat != null && location.lon != null
    raw.push({
      name: location.name,
      city: location.city,
      lat: location.lat ?? null,
      lon: location.lon ?? null,
      confidence: hasCoords ? LOCATION_WITH_COORDS : LOCATION_NAME_ONLY,
      source: 'location',
    })
  }

  // Merge by normalised name: keep the max confidence, union the sources, and
  // carry any coordinates a source contributed.
  const merged = new Map<string, PlaceGuess & { sources: Set<string> }>()
  for (const g of raw) {
    const k = normalise(g.name)
    if (!k) continue
    const prev = merged.get(k)
    if (!prev) {
      merged.set(k, {
        name: g.name,
        city: g.city ?? null,
        confidence: g.confidence,
        lat: g.lat ?? null,
        lon: g.lon ?? null,
        sources: new Set([g.source]),
      })
    } else {
      prev.sources.add(g.source)
      if (g.confidence > prev.confidence) prev.confidence = g.confidence
      prev.city = prev.city ?? g.city ?? null
      prev.lat = prev.lat ?? g.lat ?? null
      prev.lon = prev.lon ?? g.lon ?? null
    }
  }

  const fused: PlaceGuess[] = []
  for (const { sources, ...guess } of merged.values()) {
    if (sources.size >= 2) guess.confidence = Math.min(0.98, guess.confidence + CROSS_BOOST)
    fused.push(guess)
  }
  return fused.sort((a, b) => b.confidence - a.confidence)
}
