// ============================================================
// lib/google-scrape.ts — CLIENT-SAFE Google Maps scrape parsing.
//   Mirrors the pure parts of the server scraper in lib/google.ts, with
//   NO process.env / server imports, so the native app can scrape Google
//   directly from the device (residential IP, not the blocked Vercel IP)
//   via CapacitorHttp. Keep the parsing in sync with lib/google.ts.
// ============================================================

import type { FoursquareData, FoursquarePhoto } from '@/types'
import { nameSimilarity } from '@/lib/foursquare'

const GMAPS_SEARCH = 'https://www.google.com/search'
const MIN_NAME_SIMILARITY = 0.6

// Desktop UA + pre-consented cookie so Google returns the data blob instead of
// its EU consent wall.
export const SCRAPE_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
export const SCRAPE_COOKIE =
  'SOCS=CAISHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVuIAEaBgiA_LymBg; CONSENT=YES+cb.20210328-17-p0.en+FX+'

export const SCRAPE_HEADERS: Record<string, string> = {
  'User-Agent': SCRAPE_UA,
  'Accept-Language': 'fr-FR,fr;q=0.9',
  Cookie: SCRAPE_COOKIE,
}

/** Build the internal `tbm=map&pb=` search URL.
 *  @param count how many results to request (`7i`); ~40 for a viewport listing.
 *  @param spread the `1d` map extent — wider covers a whole viewport. */
export function buildScrapeUrl(
  query: string,
  lat: number,
  lon: number,
  count = 6,
  spread = 2000
): string {
  const url = new URL(GMAPS_SEARCH)
  url.searchParams.set('tbm', 'map')
  url.searchParams.set('authuser', '0')
  url.searchParams.set('hl', 'fr')
  url.searchParams.set('gl', 'fr')
  url.searchParams.set('q', query)
  url.searchParams.set(
    'pb',
    `!4m8!1m3!1d${spread}!2d${lon}!3d${lat}!3m2!1i1024!2i768!4f13.1!7i${count}!10b1`
  )
  return url.toString()
}

/** True when the body is a block/consent wall rather than the data blob. */
export function scrapeIsBlocked(text: string): boolean {
  return !text.startsWith(")]}'") || /consent\.google|sorry\/index|unusual traffic/i.test(text)
}

function googleRatingTo10(rating?: number): number | undefined {
  if (rating == null || Number.isNaN(rating)) return undefined
  return Math.round(rating * 2 * 10) / 10
}

// Absolute base so the <img> proxy URL resolves in the native app too (its
// origin is capacitor://localhost, where a relative /api path doesn't exist).
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

/** Photo served through the app's image proxy (googleusercontent CDN, unblocked). */
function scrapePhoto(url: string): FoursquarePhoto {
  return {
    id: url,
    prefix: `${API_BASE}/api/places/google-photo?u=${encodeURIComponent(url)}&sz=`,
    suffix: '',
    width: 400,
    height: 300,
  }
}

/** Strip the `)]}'` XSSI prefix and return the results entry list (data[0][1]). */
function parseScrapeBody(text: string): unknown[] {
  const body = text.replace(/^\)\]\}'\n?/, '')
  const data = JSON.parse(body)
  const entries = (data as unknown[][])?.[0]?.[1]
  return Array.isArray(entries) ? entries : []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any

interface ScrapePlace {
  name: string
  lat?: number
  lon?: number
  fsq: FoursquareData
}

/** A place from a Google text SEARCH (multiple results), for the search bar. */
export interface ScrapeSearchResult {
  name: string
  lat: number
  lon: number
  /** Full enrichment (rating/photos/hours) so a card can open from Google alone. */
  fsq: FoursquareData
}

/** Map one Google result entry (entry[14] is the place node) to normalized data. */
function mapScrapeEntry(entry: Node): ScrapePlace | null {
  const p: Node = entry?.[14]
  if (!Array.isArray(p) || typeof p[11] !== 'string') return null

  const s = JSON.stringify(p)
  const photoMatch = s.match(/https:\/\/[a-z0-9]+\.googleusercontent\.com\/[^"\\]+/)
  const rawRating = p[4]?.[7]

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
    photos: photoMatch ? [scrapePhoto(photoMatch[0])] : undefined,
    hours: hasHours ? { open_now: openNow, display: display || undefined } : undefined,
  }
  return { name: p[11], lat: p[9]?.[2], lon: p[9]?.[3], fsq }
}

/**
 * Parse a Google text-search body into a ranked list of places (name + coords +
 * rating), preserving Google's own relevance order. Empty when blocked.
 */
export function parseScrapeResults(text: string): ScrapeSearchResult[] {
  if (scrapeIsBlocked(text)) return []
  let entries: unknown[]
  try {
    entries = parseScrapeBody(text)
  } catch {
    return []
  }
  const out: ScrapeSearchResult[] = []
  for (const e of entries) {
    const m = mapScrapeEntry(e)
    if (m && typeof m.lat === 'number' && typeof m.lon === 'number') {
      out.push({ name: m.name, lat: m.lat, lon: m.lon, fsq: m.fsq })
    }
  }
  return out
}

/**
 * Parse a raw scrape response body and return the FoursquareData for the entry
 * whose name best matches `queryName` (or null when blocked / no match).
 */
export function matchScrapeBody(queryName: string, text: string): FoursquareData | null {
  if (scrapeIsBlocked(text)) return null
  let entries: unknown[]
  try {
    entries = parseScrapeBody(text)
  } catch {
    return null
  }
  const mapped = entries.map(mapScrapeEntry).filter((m): m is ScrapePlace => m !== null)

  let best: ScrapePlace | null = null
  let bestScore = 0
  for (const m of mapped) {
    const sim = nameSimilarity(queryName, m.name ?? '')
    if (sim > bestScore && sim >= MIN_NAME_SIMILARITY) {
      bestScore = sim
      best = m
    }
  }
  return best ? best.fsq : null
}
