// ============================================================
// lib/google.ts — "Rich data" enrichment layer (pluggable providers)
// ============================================================
// 4th enrichment layer, mirrors lib/foursquare.ts. Feeds the SHARED
// "rich data" slot `PlaceCard.fsq` (rating / price / photos / hours) —
// Foursquare's free tier never populates those fields, so there is no
// collision, and scoring + filters + the ~15 UI sites that already read
// `place.fsq?.…` light up with ZERO other changes.
//
// PROVIDERS (interchangeable via PLACES_PROVIDER env):
//   • serpapi — SerpAPI's `google_maps` engine (they scrape Google + handle
//               proxies/CAPTCHA). FREE tier: ~100 searches/month, no card.
//               The default when a SERPAPI_KEY is present.
//   • google  — official Google Places API (New). Reliable, needs billing.
//   • <yours> — a self-hosted scraper (proxy pool + pb parser) is a DROP-IN
//               3rd provider for real, at-scale usage — implement RichProvider
//               and register it below; nothing else changes.
//
// ToS note: photos are NOT stored. We keep only a reference/URL and serve the
// bytes on the fly via /api/places/google-photo (key/host stay server-side).
// ============================================================

import type { PlaceBase, PlaceCard, FoursquareData, FoursquarePhoto } from '@/types'
import { cacheGet, cacheSet, buildGoogleSearchKey } from './cache'
import { nameSimilarity } from './foursquare'

// Stored in cache to represent "searched, found no match"
const NEGATIVE_SENTINEL = '__no_rich_match__'

const MIN_NAME_SIMILARITY = 0.6

// ---------- Shared circuit breaker ----------
// Quota (429) / auth (401/403) errors are account-wide, not venue-specific.
// Trip a breaker for a cooldown so every remaining venue short-circuits with
// no doomed request and no log spam. Self-recovers after the cooldown.
const BREAKER_COOLDOWN_MS = 10 * 60 * 1000 // 10 min
let breakerUntil = 0

export function googleBreakerOpen(): boolean {
  return Date.now() < breakerUntil
}

function tripBreaker(provider: string, status: number, body: string): void {
  const firstTrip = !googleBreakerOpen()
  breakerUntil = Date.now() + BREAKER_COOLDOWN_MS
  if (firstTrip) {
    const reason = status === 429 ? 'quota exceeded / rate-limited' : `auth error (${status})`
    console.warn(
      `${provider} ${reason} — pausing rich enrichment for ${BREAKER_COOLDOWN_MS / 60000} min. ${body.slice(0, 120)}`
    )
  }
}

class ProviderUnavailableError extends Error {}

// ---------- Shared helpers (exported for tests) ----------

/** Ratings are 0–5 on both Google and SerpAPI; PlaceCard.fsq.rating is 0–10. */
export function googleRatingTo10(rating?: number): number | undefined {
  if (rating == null || Number.isNaN(rating)) return undefined
  return Math.round(rating * 2 * 10) / 10
}

/** Map Google's PRICE_LEVEL_* enum to the app's 1–4 scale. */
export function mapPriceLevel(level?: string): 1 | 2 | 3 | 4 | undefined {
  switch (level) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE':
      return 1
    case 'PRICE_LEVEL_MODERATE':
      return 2
    case 'PRICE_LEVEL_EXPENSIVE':
      return 3
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return 4
    default:
      return undefined
  }
}

/** Map SerpAPI's "$"/"$$"/… price string to the app's 1–4 scale. */
export function parseSerpPrice(price?: string): 1 | 2 | 3 | 4 | undefined {
  if (!price) return undefined
  const n = (price.match(/\$/g) ?? []).length
  if (n >= 1 && n <= 4) return n as 1 | 2 | 3 | 4
  return undefined
}

/**
 * Pick the item whose name best matches `queryName`, above threshold.
 * Generic over the name accessor so both provider shapes reuse it.
 */
function pickBestBy<T>(queryName: string, items: T[], getName: (item: T) => string): T | null {
  let best: T | null = null
  let bestScore = 0
  for (const item of items) {
    const sim = nameSimilarity(queryName, getName(item) ?? '')
    if (sim > bestScore && sim >= MIN_NAME_SIMILARITY) {
      bestScore = sim
      best = item
    }
  }
  return best
}

// ============================================================
// Provider: Google Places API (New)
// ============================================================

const GOOGLE_BASE = 'https://places.googleapis.com/v1'
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''

const GOOGLE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.regularOpeningHours',
  'places.photos',
].join(',')

interface GooglePlace {
  id: string
  displayName?: { text?: string }
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  regularOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] }
  photos?: { name: string; widthPx?: number; heightPx?: number }[]
}

/**
 * Encode a Google photo reference into a FoursquarePhoto so the existing UI
 * (`${prefix}${size}${suffix}`) builds a URL to our same-origin proxy, e.g.
 * `/api/places/google-photo?ref=<name>&sz=600x400`. `suffix` stays empty.
 */
export function encodeGooglePhoto(photo: {
  name: string
  widthPx?: number
  heightPx?: number
}): FoursquarePhoto {
  return {
    id: photo.name,
    prefix: `/api/places/google-photo?ref=${encodeURIComponent(photo.name)}&sz=`,
    suffix: '',
    width: photo.widthPx ?? 400,
    height: photo.heightPx ?? 400,
  }
}

/** Map a matched Google place to the shared FoursquareData slot. */
export function mapGoogleToFsq(place: GooglePlace): FoursquareData {
  const photos = (place.photos ?? []).slice(0, 10).map(encodeGooglePhoto)
  const hours = place.regularOpeningHours
  return {
    fsq_id: place.id,
    rating: googleRatingTo10(place.rating),
    total_ratings: place.userRatingCount,
    price: mapPriceLevel(place.priceLevel),
    photos: photos.length > 0 ? photos : undefined,
    hours: hours
      ? { open_now: hours.openNow, display: hours.weekdayDescriptions?.join(' · ') }
      : undefined,
  }
}

const googleProvider: RichProvider = {
  name: 'google',
  configured: () => !!GOOGLE_API_KEY,
  async searchOne(place) {
    const res = await fetch(`${GOOGLE_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': GOOGLE_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: place.name,
        languageCode: 'fr',
        maxResultCount: 5,
        locationBias: {
          circle: { center: { latitude: place.lat, longitude: place.lon }, radius: 120 },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      if ([429, 401, 403].includes(res.status)) {
        tripBreaker('Google Places', res.status, body)
        throw new ProviderUnavailableError(`Google ${res.status}`)
      }
      throw new Error(`Google ${res.status}: ${body.slice(0, 200)}`)
    }
    const data = (await res.json()) as { places?: GooglePlace[] }
    const match = pickBestBy(place.name, data.places ?? [], (p) => p.displayName?.text ?? '')
    return match ? mapGoogleToFsq(match) : null
  },
}

// ============================================================
// Provider: SerpAPI (google_maps engine) — scrapes Google for us
// ============================================================

const SERPAPI_BASE = 'https://serpapi.com/search.json'
const SERPAPI_KEY = process.env.SERPAPI_KEY ?? ''

interface SerpResult {
  place_id?: string
  data_id?: string
  title?: string
  rating?: number
  reviews?: number
  price?: string
  open_state?: string
  hours?: unknown
  operating_hours?: Record<string, string>
  thumbnail?: string
}

/** Build a FoursquarePhoto proxying a SerpAPI thumbnail (googleusercontent). */
export function serpPhoto(url: string): FoursquarePhoto {
  return {
    id: url,
    prefix: `/api/places/google-photo?u=${encodeURIComponent(url)}&sz=`,
    suffix: '',
    width: 400,
    height: 300,
  }
}

/** Map a matched SerpAPI result to the shared FoursquareData slot. */
export function mapSerpToFsq(r: SerpResult): FoursquareData {
  const weekday =
    r.operating_hours && typeof r.operating_hours === 'object'
      ? Object.values(r.operating_hours)
      : undefined
  const hasHours = !!(weekday?.length || r.open_state)
  return {
    fsq_id: r.place_id ?? r.data_id ?? '',
    rating: googleRatingTo10(r.rating),
    total_ratings: r.reviews,
    price: parseSerpPrice(r.price),
    photos: r.thumbnail ? [serpPhoto(r.thumbnail)] : undefined,
    hours: hasHours
      ? {
          open_now: r.open_state ? /open/i.test(r.open_state) : undefined,
          display: weekday?.join(' · '),
        }
      : undefined,
  }
}

const serpApiProvider: RichProvider = {
  name: 'serpapi',
  configured: () => !!SERPAPI_KEY,
  async searchOne(place) {
    const url = new URL(SERPAPI_BASE)
    url.searchParams.set('engine', 'google_maps')
    url.searchParams.set('type', 'search')
    url.searchParams.set('q', place.name)
    url.searchParams.set('ll', `@${place.lat},${place.lon},15z`)
    url.searchParams.set('hl', 'fr')
    url.searchParams.set('api_key', SERPAPI_KEY)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      if ([429, 401, 403].includes(res.status)) {
        tripBreaker('SerpAPI', res.status, body)
        throw new ProviderUnavailableError(`SerpAPI ${res.status}`)
      }
      throw new Error(`SerpAPI ${res.status}: ${body.slice(0, 200)}`)
    }
    const data = (await res.json()) as {
      error?: string
      place_results?: SerpResult
      local_results?: SerpResult[]
    }
    if (data.error) throw new Error(`SerpAPI: ${data.error.slice(0, 200)}`)
    const candidates = data.place_results ? [data.place_results] : (data.local_results ?? [])
    const match = pickBestBy(place.name, candidates, (c) => c.title ?? '')
    return match ? mapSerpToFsq(match) : null
  },
}

// ============================================================
// Provider: home-made scraper (DIY) — hits Google Maps' internal
// `tbm=map&pb=` endpoint directly. FREE, no key. Returns name / rating /
// gps / photo / today's hours + open-now.
//
// ⚠️ Runs from THIS server's IP. Works from residential/most IPs, but Google
// CAPTCHA-blocks datacenter IPs (Vercel) → expect this to degrade in prod and
// need a residential-proxy pool + worker later. The breaker + graceful null
// keep it from spamming when blocked. Review count / price aren't in this
// lightweight response (would need a per-place details request).
// ============================================================

const GMAPS_SEARCH = 'https://www.google.com/search'
// A desktop UA + a pre-consented cookie so Google doesn't 302 to its EU
// consent wall (which strips the data blob).
const SCRAPE_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const SCRAPE_COOKIE =
  'SOCS=CAISHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVuIAEaBgiA_LymBg; CONSENT=YES+cb.20210328-17-p0.en+FX+'

/** Build the `pb` viewport/query blob for a single-place lookup. */
function buildPb(lat: number, lon: number, count = 6): string {
  return `!4m8!1m3!1d2000!2d${lon}!3d${lat}!3m2!1i1024!2i768!4f13.1!7i${count}!10b1`
}

/** Strip the `)]}'` XSSI prefix and return the results entry list (data[0][1]). */
export function parseScrapeBody(text: string): unknown[] {
  const body = text.replace(/^\)\]\}'\n?/, '')
  const data = JSON.parse(body)
  const entries = (data as unknown[][])?.[0]?.[1]
  return Array.isArray(entries) ? entries : []
}

/** Enlarge a googleusercontent thumbnail (…/s44-… → …/s{size}-…). */
export function upsizeGooglePhotoUrl(url: string, size = 600): string {
  return url.replace(/\/s\d+-/, `/s${size}-`)
}

interface ScrapePlace {
  name: string
  lat?: number
  lon?: number
  fsq: FoursquareData
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any

/** Map one scrape result entry (entry[14] is the place node) to normalized data. */
export function mapScrapeEntry(entry: Node): ScrapePlace | null {
  const p: Node = entry?.[14]
  if (!Array.isArray(p) || typeof p[11] !== 'string') return null

  const s = JSON.stringify(p)
  const photoMatch = s.match(/https:\/\/[a-z0-9]+\.googleusercontent\.com\/[^"\\]+/)
  const rawRating = p[4]?.[7]

  // Hours live at p[203]: [ [ [dayName, dayNum, [y,m,d], [[ "12:00–00:00", … ]] ] … ], … ]
  const hoursNode: Node = p[203]
  const week: Node[] = Array.isArray(hoursNode?.[0]) ? hoursNode[0] : []
  const display = week
    .map(
      (d) =>
        `${d?.[0]}: ${(d?.[3] ?? [])
          .map((r: Node) => r?.[0])
          .filter(Boolean)
          .join(', ')}`
    )
    .filter((line) => !line.endsWith(': '))
    .join(' · ')
  const openState = JSON.stringify(hoursNode ?? '').match(
    /"(Ouvert|Fermé|Ferme|Open|Closed)[^"]{0,60}"/
  )?.[0]
  const openNow = openState ? /"(Ouvert|Open)/i.test(openState) : undefined
  const hasHours = !!(display || openState)

  const fsq: FoursquareData = {
    fsq_id: typeof p[10] === 'string' ? p[10] : '',
    rating: googleRatingTo10(typeof rawRating === 'number' ? rawRating : undefined),
    photos: photoMatch ? [serpPhoto(photoMatch[0])] : undefined,
    hours: hasHours ? { open_now: openNow, display: display || undefined } : undefined,
  }

  return { name: p[11], lat: p[9]?.[2], lon: p[9]?.[3], fsq }
}

const scrapeProvider: RichProvider = {
  name: 'scrape',
  // No credential needed. Disable explicitly with PLACES_SCRAPE=off.
  configured: () => process.env.PLACES_SCRAPE !== 'off',
  async searchOne(place) {
    const url = new URL(GMAPS_SEARCH)
    url.searchParams.set('tbm', 'map')
    url.searchParams.set('authuser', '0')
    url.searchParams.set('hl', 'fr')
    url.searchParams.set('gl', 'fr')
    url.searchParams.set('q', place.name)
    url.searchParams.set('pb', buildPb(place.lat, place.lon))

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': SCRAPE_UA,
        'Accept-Language': 'fr-FR,fr;q=0.9',
        Cookie: SCRAPE_COOKIE,
      },
      signal: AbortSignal.timeout(12_000),
    })
    const text = await res.text()
    // Consent wall / CAPTCHA / block → account-wide, trip the breaker.
    if (!text.startsWith(")]}'") || /consent\.google|sorry\/index|unusual traffic/i.test(text)) {
      tripBreaker('Google Maps scrape', res.status === 200 ? 429 : res.status, text.slice(0, 200))
      throw new ProviderUnavailableError('scrape blocked')
    }

    const entries = parseScrapeBody(text)
    const mapped = entries.map(mapScrapeEntry).filter((m): m is ScrapePlace => m !== null)
    const match = pickBestBy(place.name, mapped, (m) => m.name)
    return match ? match.fsq : null
  },
}

// ============================================================
// Provider registry + dispatch
// ============================================================

export interface RichProvider {
  readonly name: string
  configured(): boolean
  searchOne(place: PlaceBase): Promise<FoursquareData | null>
}

const PROVIDERS: Record<string, RichProvider> = {
  scrape: scrapeProvider,
  serpapi: serpApiProvider,
  google: googleProvider,
}

/**
 * Resolve the active provider. Explicit PLACES_PROVIDER wins; otherwise prefer
 * a keyed service if configured (more reliable), else fall back to the DIY
 * scraper (free, no key — the current default per project choice).
 */
function activeProvider(): RichProvider | null {
  const forced = process.env.PLACES_PROVIDER
  if (forced && PROVIDERS[forced]) return PROVIDERS[forced]
  if (serpApiProvider.configured()) return serpApiProvider
  if (googleProvider.configured()) return googleProvider
  return scrapeProvider.configured() ? scrapeProvider : null
}

/** True when the active provider has its credential set. */
export function richProviderConfigured(): boolean {
  const p = activeProvider()
  return !!p && p.configured()
}

// ---------- Per-place enrichment (cache + breaker + dispatch) ----------

async function enrichOne(place: PlaceBase): Promise<FoursquareData | null> {
  const provider = activeProvider()
  if (!provider || !provider.configured() || googleBreakerOpen()) return null

  const cacheKey = buildGoogleSearchKey(place.lat, place.lon, place.name)
  const raw = cacheGet<FoursquareData | string>(cacheKey)
  if (raw === NEGATIVE_SENTINEL) return null
  if (raw !== null) return raw as FoursquareData

  try {
    const fsq = await provider.searchOne(place)
    if (!fsq) {
      cacheSet(cacheKey, NEGATIVE_SENTINEL, 3600)
      return null
    }
    cacheSet(cacheKey, fsq, 3600) // in-memory only, 1h
    return fsq
  } catch (err) {
    // ProviderUnavailableError = account-wide (breaker already logged once) → quiet.
    if (!(err instanceof ProviderUnavailableError)) {
      console.warn(`Rich enrichment failed for "${place.name}":`, err)
    }
    return null
  }
}

// ---------- Batch enrichment ----------

/**
 * Enrich a batch of places, MERGING provider data into the shared `fsq` slot.
 * Foursquare-provided fields (categories) are preserved; the provider fills
 * rating / price / photos / hours that FSQ's free tier leaves empty.
 * Concurrency-limited. Places with no match pass through unchanged.
 */
export async function enrichPlacesGoogle(places: PlaceCard[]): Promise<PlaceCard[]> {
  const CONCURRENCY = 5
  const results: PlaceCard[] = []

  for (let i = 0; i < places.length; i += CONCURRENCY) {
    const batch = places.slice(i, i + CONCURRENCY)
    const enriched = await Promise.all(
      batch.map(async (place) => {
        const rich = await enrichOne(place)
        if (!rich) return place
        const merged: FoursquareData = { ...place.fsq, ...rich }
        if (!merged.categories && place.fsq?.categories) merged.categories = place.fsq.categories
        return {
          ...place,
          fsq: merged,
          fsq_rating: merged.rating ?? place.fsq_rating,
          open_now: place.open_now ?? rich.hours?.open_now,
        }
      })
    )
    results.push(...enriched)
  }

  return results
}
