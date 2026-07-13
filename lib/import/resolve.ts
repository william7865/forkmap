// ============================================================
// lib/import/resolve.ts — resolve a pending import ON THE DEVICE.
//
// Why on the device: the Google resolver is a scrape, and Google blocks the
// Vercel datacenter IP. The device has a residential IP, so it is the only
// place this can run. Consequence, accepted: an import stays `pending` until
// the app is next opened.
//
// Returns the patch to persist. It performs no API write itself, so it can be
// tested with mocked network helpers.
//
// Three invariants this module is responsible for — nothing downstream (neither
// Postgres nor the PATCH's Zod schema) enforces them:
//   1. `resolved` ⇒ `place_snapshot` AND `osm_id`, in the SAME patch. A resolved
//      row without a snapshot crashes the detail sheet later (`place_snapshot!`).
//   2. `ambiguous` ⇒ a non-empty `candidates` list, or the UI asks "C'est
//      lequel ?" with nothing to pick.
//   3. Every branch — unreadable post, no guess, dead network, thrown error —
//      returns a TERMINAL status. A row stuck in `pending` is a thumbnail that
//      spins forever.
// ============================================================
import type { ImportRow, ImportCandidatePlace, PlaceCard, PlaceBase } from '@/types'
import { fetchPostMetadata } from '@/lib/import/metadata'
import { buildImportCandidate } from '@/lib/import/parse'
import { extractPlaceCandidates, type PlaceGuess } from '@/lib/import/candidates'
import { scoreResolution, nameSimilarity } from '@/lib/import/confidence'
import { searchPlacesOnce, type PlaceSearchResult } from '@/lib/hooks/usePlaceSearch'
import { haversineDistance } from '@/lib/scoring'

/** Paris — a fallback centre so the resolver never silently no-ops at cold start. */
const PARIS: [number, number] = [48.8566, 2.3522]

/**
 * At most 3 guesses are tried. Each one is a Google scrape, and a chatty caption
 * can yield eight of them — firing them back to back is how a device gets
 * blocked. The guesses are ranked by confidence, so the tail is the part least
 * worth paying for anyway.
 */
const MAX_GUESSES = 3

/** The PATCH route caps `candidates` at 3 (same cap as `scoreResolution`). */
const MAX_CANDIDATES = 3

/**
 * Server-side (Zod) limits of PATCH /api/imports/[id]. A patch that violates one
 * is rejected with a 400 — and the row would stay `pending` forever. So the
 * clamping happens here, before the write, not in the route.
 */
const LIMIT = {
  title: 500,
  caption: 3000,
  author: 120,
  thumb: 2048,
  osmId: 64,
  name: 255,
  context: 255,
} as const

/** Two name scores within this much of each other are a tie: the map centre
 *  breaks it (the nearest venue is the likelier one). Used ONLY to order the
 *  choices we show the user — never to promote a match past the confidence gate. */
const TIE = 0.05

function nowIso(): string {
  return new Date().toISOString()
}

function truncate(value: string | null | undefined, max: number): string | null {
  const s = (value ?? '').trim()
  if (!s) return null
  return s.length > max ? s.slice(0, max) : s
}

/** The route validates `post_thumb` as a URL, so anything else must not be sent. */
function safeUrl(value: string | undefined): string | null {
  if (!value || value.length > LIMIT.thumb) return null
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

/** A result we can actually place on a map and store. */
function isUsable(r: PlaceSearchResult): boolean {
  return (
    typeof r.name === 'string' &&
    r.name.trim().length > 0 &&
    Number.isFinite(r.lat) &&
    Number.isFinite(r.lon) &&
    Math.abs(r.lat) <= 90 &&
    Math.abs(r.lon) <= 180
  )
}

/**
 * The id we persist. Nominatim gives a real OSM id; a Google-only venue gets the
 * same synthetic `g/lat,lon` id `useHomeState.searchSelectPlace` already mints —
 * so an imported place and a searched place dedupe against each other (favorites
 * and lists key on `osm_id`).
 */
function placeId(r: PlaceSearchResult): string | null {
  const id = r.osm_id ?? `g/${r.lat.toFixed(5)},${r.lon.toFixed(5)}`
  return id.length > 0 && id.length <= LIMIT.osmId ? id : null
}

function toCandidatePlace(r: PlaceSearchResult): ImportCandidatePlace | null {
  if (!isUsable(r)) return null
  const osm_id = r.osm_id && r.osm_id.length <= LIMIT.osmId ? r.osm_id : undefined
  return {
    ...(osm_id ? { osm_id } : {}),
    name: r.name.trim().slice(0, LIMIT.name),
    context: (r.context ?? '').slice(0, LIMIT.context),
    lat: r.lat,
    lon: r.lon,
    ...(typeof r.rating === 'number' && Number.isFinite(r.rating) ? { rating: r.rating } : {}),
  }
}

/** A resolved search result → the PlaceCard snapshot we persist (like `favorites`).
 *  Returns null when the result can't make a valid card — the caller must then
 *  NOT write `resolved` (invariant 1). */
function toPlaceCard(r: PlaceSearchResult): PlaceCard | null {
  if (!isUsable(r)) return null
  const osm_id = placeId(r)
  if (!osm_id) return null

  const prefix = osm_id.split('/')[0]
  const osm_type: PlaceBase['osm_type'] =
    prefix === 'way' || prefix === 'relation' ? prefix : 'node'

  const card: PlaceCard = {
    osm_id,
    osm_type,
    name: r.name.trim(),
    lat: r.lat,
    lon: r.lon,
    tags: {},
  }
  if (r.fsq) {
    card.fsq = r.fsq
    if (typeof r.fsq.rating === 'number') card.fsq_rating = r.fsq.rating
  }
  // Nominatim's `context` is a real address; Google's is the literal string
  // "Google Maps", which must never be shown as one.
  if (r.source === 'osm' && r.context) card.address = r.context
  return card
}

/**
 * Order the choices we hand the user. Primary key stays the name similarity (the
 * confidence module's own ranking), but ties are broken by distance to the map
 * centre — the signal `confidence.ts` is pure and cannot see. Bucketing the
 * score keeps the comparator transitive.
 */
function rankForUser(
  guess: PlaceGuess,
  results: PlaceSearchResult[],
  at: [number, number]
): PlaceSearchResult[] {
  return results
    .map((place) => ({
      place,
      bucket: Math.round(nameSimilarity(guess.name, place.name) / TIE),
      distance: haversineDistance(at[0], at[1], place.lat, place.lon),
    }))
    .sort((a, b) => b.bucket - a.bucket || a.distance - b.distance)
    .map((s) => s.place)
}

/** Reading the post can throw (native bridge missing, offline). Never let it. */
async function readMetadata(url: string) {
  try {
    return await fetchPostMetadata(url)
  } catch (err) {
    console.warn('[resolveImport] metadata read failed', err)
    return null
  }
}

/** The oracle can throw (scrape blocked, offline). A dead query is just no result. */
async function askOracle(query: string, at: [number, number]): Promise<PlaceSearchResult[]> {
  try {
    const results = await searchPlacesOnce(query, at)
    return results.filter(isUsable)
  } catch (err) {
    console.warn('[resolveImport] place search failed', err)
    return []
  }
}

function failed(meta: Partial<ImportRow>): Partial<ImportRow> {
  return {
    ...meta,
    status: 'failed',
    osm_id: null,
    place_snapshot: null,
    candidates: null,
    resolved_at: nowIso(),
  }
}

async function run(row: ImportRow, center: [number, number] | null): Promise<Partial<ImportRow>> {
  const at = center ?? PARIS

  // 1. Read the post (oEmbed, else Open Graph as a crawler UA — residential IP).
  //    On the web the native bridge is absent and this is always null: the hook
  //    is what keeps the web from burning `pending` rows (see useImports).
  const og = await readMetadata(row.url)
  if (!og) return failed({})

  const parsed = buildImportCandidate(og, row.url)
  const meta: Partial<ImportRow> = {
    post_title: truncate(parsed.title, LIMIT.title),
    post_caption: truncate(parsed.description, LIMIT.caption),
    post_author: parsed.handle ? truncate(`@${parsed.handle}`, LIMIT.author) : null,
    post_thumb: safeUrl(og.image),
  }

  // 2. Guess the venue names, best first. Roughly one caption in ten names
  //    nothing at all — that is a `failed`, and the user picks by hand.
  const guesses = extractPlaceCandidates(parsed).slice(0, MAX_GUESSES)
  if (guesses.length === 0) return failed(meta)

  // 3. Ask the oracle (Google first — it is authoritative; OSM is the safety net,
  //    and searchPlacesOnce already queries both). Stop at the first guess that
  //    yields a verdict; a guess that resolves to nothing just moves to the next.
  for (const guess of guesses) {
    const query = guess.city ? `${guess.name} ${guess.city}` : guess.name
    const results = await askOracle(query, at)
    const verdict = scoreResolution(guess, results)

    if (verdict.status === 'resolved') {
      const place = toPlaceCard(verdict.place)
      // Invariant 1: `resolved` ⇒ snapshot + osm_id, together, or not at all.
      if (place) {
        return {
          ...meta,
          status: 'resolved',
          osm_id: place.osm_id,
          place_snapshot: place,
          candidates: null,
          resolved_at: nowIso(),
        }
      }
      // The winner can't be snapshotted → this is not a resolution. Ask instead.
      const fallback = pickCandidates(guess, results, at)
      if (fallback.length > 0) return ambiguous(meta, fallback)
      continue
    }

    if (verdict.status === 'ambiguous') {
      const candidates = pickCandidates(guess, verdict.candidates, at)
      // Invariant 2: `ambiguous` ⇒ a list the user can actually pick from.
      if (candidates.length > 0) return ambiguous(meta, candidates)
    }
    // 'failed' for this guess → try the next one.
  }

  return failed(meta)
}

function pickCandidates(
  guess: PlaceGuess,
  results: PlaceSearchResult[],
  at: [number, number]
): ImportCandidatePlace[] {
  return rankForUser(guess, results, at)
    .map(toCandidatePlace)
    .filter((c): c is ImportCandidatePlace => c !== null)
    .slice(0, MAX_CANDIDATES)
}

function ambiguous(
  meta: Partial<ImportRow>,
  candidates: ImportCandidatePlace[]
): Partial<ImportRow> {
  return {
    ...meta,
    status: 'ambiguous',
    osm_id: null,
    place_snapshot: null,
    candidates,
    resolved_at: nowIso(),
  }
}

/**
 * Resolve one pending import. Always returns a terminal patch (invariant 3):
 * anything unexpected degrades to `failed`, never to a rejected promise.
 */
export async function resolveImport(
  row: ImportRow,
  center: [number, number] | null
): Promise<Partial<ImportRow>> {
  try {
    return await run(row, center)
  } catch (err) {
    console.error('[resolveImport] unexpected error', row.id, err)
    return failed({})
  }
}
