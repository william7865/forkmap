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
import { fuseCandidates, cleanOcrText, type PlaceGuess } from '@/lib/import/candidates'
import { scoreResolution, nameSimilarity, chainMatches } from '@/lib/import/confidence'
import { searchPlacesOnce, type PlaceSearchResult } from '@/lib/hooks/usePlaceSearch'
import { nativeOcrRecognize, nativeOcrRecognizeVideo } from '@/lib/native/ocr'
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

/** Geotag fast path: a tagged venue must sit within this of the tag's coords, and
 *  the name must match at least this well, to resolve by proximity. */
const GEO_RADIUS_KM = 0.4
const GEO_NAME_MIN = 0.6

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
 *  NOT write `resolved` (invariant 1).
 *
 *  Exported because the import detail writes the same patch when the USER picks
 *  the venue (ambiguous → chosen candidate, failed → manual search): the snapshot
 *  must be built the exact same way, or invariant 1 holds only for the resolver. */
export function toPlaceCard(r: PlaceSearchResult): PlaceCard | null {
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
 * A candidate the user picked in "C'est lequel ?" → the snapshot to persist.
 *
 * A candidate is a lossy projection of the search result (no `fsq` payload, just
 * a rating), so the star is rebuilt into the `fsq` slot the whole UI reads
 * (`place.fsq?.rating`) — otherwise a chosen venue would render without its note.
 */
export function candidateToPlaceCard(c: ImportCandidatePlace): PlaceCard | null {
  const card = toPlaceCard({
    id: c.osm_id ?? `g:${c.lat.toFixed(5)},${c.lon.toFixed(5)}`,
    osm_id: c.osm_id,
    name: c.name,
    context: c.context,
    lat: c.lat,
    lon: c.lon,
    rating: c.rating,
    source: c.osm_id ? 'osm' : 'google',
  })
  if (!card) return null
  if (typeof c.rating === 'number' && Number.isFinite(c.rating)) {
    card.fsq = { fsq_id: card.osm_id, rating: c.rating }
    card.fsq_rating = c.rating
  }
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

/** The usable result closest to the map centre — how a chain picks its branch. */
function nearestTo(results: PlaceSearchResult[], at: [number, number]): PlaceSearchResult | null {
  let best: PlaceSearchResult | null = null
  let bestDistance = Infinity
  for (const r of results) {
    if (!isUsable(r)) continue
    const d = haversineDistance(at[0], at[1], r.lat, r.lon)
    if (d < bestDistance) {
      bestDistance = d
      best = r
    }
  }
  return best
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

  // 1. Read the post: caption + thumbnail (Open Graph / oEmbed) AND the geotag,
  //    all through the residential-IP bridge. On the web the bridge is absent and
  //    this is always null: the hook keeps the web from burning `pending` rows.
  const read = await readMetadata(row.url)
  if (!read) return failed({})
  const { og, location } = read

  const parsed = buildImportCandidate(og, row.url)
  const meta: Partial<ImportRow> = {
    post_title: truncate(parsed.title, LIMIT.title),
    post_caption: truncate(parsed.description, LIMIT.caption),
    post_author: parsed.handle ? truncate(`@${parsed.handle}`, LIMIT.author) : null,
    post_thumb: safeUrl(og.image),
  }

  // Each phase adds a signal and re-tries. We return on the FIRST resolution;
  // otherwise we keep the richest "à confirmer" list seen (later phases fuse more
  // signals, so their ambiguous set is a superset) and fall back to it at the end.
  let best: Partial<ImportRow> | null = null

  // Phase 1 — the fast path: caption + geotag only. A clean 📍 or a geotag
  // resolves here without paying for any OCR.
  const r1 = await resolveGuesses(
    fuseCandidates({ post: parsed, location }).slice(0, MAX_GUESSES),
    meta,
    at
  )
  if (r1?.status === 'resolved') return r1
  best = r1 ?? best

  // Phase 2 — read the name off the thumbnail (native OCR). Rescues captions that
  // never spell the venue out (the name is stamped on the cover).
  const thumbOcr = meta.post_thumb ? await readOcr(meta.post_thumb) : null
  if (thumbOcr) {
    const r2 = await resolveGuesses(
      fuseCandidates({ post: parsed, location, ocrText: thumbOcr }).slice(0, MAX_GUESSES),
      meta,
      at
    )
    if (r2?.status === 'resolved') return r2
    best = r2 ?? best
  }

  // Phase 3 — last resort: OCR a few frames of the video itself, for a name shown
  // only mid-clip. Heavy (downloads the video), so it runs ONLY when everything
  // else failed and the post exposes a playable video URL.
  const videoUrl = safeUrl(og.video)
  if (videoUrl) {
    const videoOcr = await readVideoOcr(videoUrl)
    if (videoOcr) {
      const combined = [thumbOcr, videoOcr].filter(Boolean).join('\n')
      const r3 = await resolveGuesses(
        fuseCandidates({ post: parsed, location, ocrText: combined }).slice(0, MAX_GUESSES),
        meta,
        at
      )
      if (r3?.status === 'resolved') return r3
      best = r3 ?? best
    }
  }

  return best ?? failed(meta)
}

/**
 * Try each guess best-first; return the first terminal verdict (resolved or
 * ambiguous), or null when every guess came up empty. A guess carrying geotag
 * coordinates takes a proximity fast path first.
 */
async function resolveGuesses(
  guesses: PlaceGuess[],
  meta: Partial<ImportRow>,
  at: [number, number]
): Promise<Partial<ImportRow> | null> {
  for (const guess of guesses) {
    // Geotag fast path: the venue sits at known coordinates.
    if (guess.lat != null && guess.lon != null) {
      const byCoords = await resolveByCoords(guess, guess.lat, guess.lon, meta)
      if (byCoords) return byCoords
    }

    const query = guess.city ? `${guess.name} ${guess.city}` : guess.name
    const results = await askOracle(query, at)
    const verdict = scoreResolution(guess, results)

    if (verdict.status === 'resolved') {
      const place = toPlaceCard(verdict.place)
      // Invariant 1: `resolved` ⇒ snapshot + osm_id, together, or not at all.
      if (place) return resolvedPatch(meta, place)
      // The winner can't be snapshotted → this is not a resolution. Ask instead.
      const fallback = pickCandidates(guess, results, at)
      if (fallback.length > 0) return ambiguous(meta, fallback)
      continue
    }

    if (verdict.status === 'ambiguous') {
      // A chain (several results with the SAME name) is not an ambiguity: it is
      // one brand with several branches → resolve to the branch nearest the map
      // centre. This does NOT relax the confidence gate — chainMatches requires
      // the same STRONG name match; it only reads the tie the gate left open.
      const branches = chainMatches(guess, results)
      if (branches.length >= 2) {
        const nearest = nearestTo(branches, at)
        const place = nearest ? toPlaceCard(nearest) : null
        if (place) return resolvedPatch(meta, place)
      }

      const candidates = pickCandidates(guess, verdict.candidates, at)
      // Invariant 2: `ambiguous` ⇒ a list the user can actually pick from.
      if (candidates.length > 0) return ambiguous(meta, candidates)
    }
    // 'failed' for this guess → try the next one.
  }

  return null
}

/**
 * Resolve a geotagged guess by proximity: search its name near the tagged coords
 * and take the nearest strong-name match within GEO_RADIUS_KM. When no real place
 * matches, the creator's tag itself (name + coords) is trustworthy enough to
 * resolve to — a tagged venue is the strongest signal there is.
 */
async function resolveByCoords(
  guess: PlaceGuess,
  lat: number,
  lon: number,
  meta: Partial<ImportRow>
): Promise<Partial<ImportRow> | null> {
  const results = await askOracle(guess.name, [lat, lon])
  let best: PlaceSearchResult | null = null
  let bestDistance = Infinity
  for (const r of results) {
    if (nameSimilarity(guess.name, r.name) < GEO_NAME_MIN) continue
    const d = haversineDistance(lat, lon, r.lat, r.lon)
    if (d < bestDistance) {
      bestDistance = d
      best = r
    }
  }
  if (best && bestDistance <= GEO_RADIUS_KM) {
    const place = toPlaceCard(best)
    if (place) return resolvedPatch(meta, place)
  }

  // No matching real place near the tag → resolve to the tagged venue itself.
  const synth = toPlaceCard({
    id: `g:${lat.toFixed(5)},${lon.toFixed(5)}`,
    name: guess.name,
    context: '',
    lat,
    lon,
    source: 'google',
  })
  return synth ? resolvedPatch(meta, synth) : null
}

function resolvedPatch(meta: Partial<ImportRow>, place: PlaceCard): Partial<ImportRow> {
  return {
    ...meta,
    status: 'resolved',
    osm_id: place.osm_id,
    place_snapshot: place,
    candidates: null,
    resolved_at: nowIso(),
  }
}

/** OCR the thumbnail into clean text. Native-only; null on web or on failure. */
async function readOcr(imageUrl: string): Promise<string | null> {
  try {
    const lines = await nativeOcrRecognize(imageUrl)
    if (!lines || lines.length === 0) return null
    const text = cleanOcrText(lines)
    return text.length > 0 ? text : null
  } catch (err) {
    console.warn('[resolveImport] OCR failed', err)
    return null
  }
}

/** OCR a few frames of the video into clean text. Native-only; null on failure. */
async function readVideoOcr(videoUrl: string): Promise<string | null> {
  try {
    const lines = await nativeOcrRecognizeVideo(videoUrl)
    if (!lines || lines.length === 0) return null
    const text = cleanOcrText(lines)
    return text.length > 0 ? text : null
  } catch (err) {
    console.warn('[resolveImport] video OCR failed', err)
    return null
  }
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
