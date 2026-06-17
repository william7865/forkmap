// ============================================================
// lib/foursquare.ts — Foursquare Places API (nouvelle plateforme)
// ============================================================
// Migré depuis l'API v3 legacy (sunset). Base places-api.foursquare.com,
// auth Bearer + header de version. On n'utilise QUE les champs GRATUITS
// (free tier) : catégories + adresse + géo. Les champs riches (rating,
// price, photos, hours) sont "Premium" (payants) → volontairement non
// demandés. L'app reste gratuite ; notes/photos viennent d'OSM/Wikidata.
// Docs: https://docs.foursquare.com/developer/reference
// ============================================================

import type { PlaceBase, PlaceCard, FoursquareData, FoursquareCategory } from '@/types'
import { cacheGet, cacheSet, buildFsqSearchKey } from './cache'

const FSQ_BASE = 'https://places-api.foursquare.com'
const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY ?? ''
const FSQ_VERSION = '2025-06-17'

// Stored in cache to represent "searched FSQ, found no match"
const NEGATIVE_SENTINEL = '__no_fsq_match__'

// Free-tier fields only (rating/price/photos/hours are Premium → omitted)
const SEARCH_FIELDS = 'fsq_place_id,name,latitude,longitude,categories,location'

// ---------- Helpers ----------

function fsqHeaders(): HeadersInit {
  return {
    accept: 'application/json',
    Authorization: `Bearer ${FSQ_API_KEY}`,
    'X-Places-Api-Version': FSQ_VERSION,
  }
}

async function fsqGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${FSQ_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: fsqHeaders(),
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 3600 }, // Next.js fetch cache 1h
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`FSQ ${res.status}: ${body.slice(0, 200)}`)
  }

  return res.json() as Promise<T>
}

// ---------- Types from the new FSQ API ----------

interface FsqSearchResult {
  results: FsqVenue[]
}

interface FsqCategory {
  fsq_category_id: string
  name: string
  short_name?: string
  plural_name?: string
  icon?: { prefix: string; suffix: string }
}

interface FsqVenue {
  fsq_place_id: string
  name: string
  latitude?: number
  longitude?: number
  categories?: FsqCategory[]
  location?: {
    address?: string
    locality?: string
    region?: string
    postcode?: string
    country?: string
    formatted_address?: string
  }
}

// ---------- Fuzzy name matching ----------

function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

function nameSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const na = normalize(a),
    nb = normalize(b)
  if (na === nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(na, nb) / maxLen
}

// ---------- Normalizer (free fields only) ----------

function normalizeFsqVenue(venue: FsqVenue): FoursquareData {
  const categories: FoursquareCategory[] = (venue.categories ?? []).map((c) => ({
    id: 0, // new API uses a string category id; unused by the UI (name only)
    name: c.short_name ?? c.name,
    icon: c.icon,
  }))

  // Only free fields are populated. rating/price/photos/hours stay undefined
  // (they are Premium on the new platform) — the UI degrades gracefully.
  return {
    fsq_id: venue.fsq_place_id,
    categories: categories.length > 0 ? categories : undefined,
  }
}

// ---------- Search + match ----------

const RADIUS_M = 120 // Search radius for FSQ match (meters)
const MIN_NAME_SIMILARITY = 0.6

interface FsqMatch {
  fsq: FoursquareData
  address?: string
}

/**
 * Search FSQ for a single place by lat/lon + name (free fields only).
 * Returns the best matching venue's free data + formatted address, or null.
 */
async function searchFsqVenue(place: PlaceBase): Promise<FsqMatch | null> {
  if (!FSQ_API_KEY) return null

  const cacheKey = buildFsqSearchKey(place.lat, place.lon, place.name)
  const raw = cacheGet<FsqMatch | string>(cacheKey)
  if (raw === NEGATIVE_SENTINEL) return null
  if (raw !== null) return raw as FsqMatch

  try {
    const data = await fsqGet<FsqSearchResult>('/places/search', {
      ll: `${place.lat},${place.lon}`,
      radius: String(RADIUS_M),
      query: place.name,
      fields: SEARCH_FIELDS,
      limit: '5',
    })

    const results = data.results ?? []
    let bestMatch: FsqVenue | null = null
    let bestScore = 0
    for (const venue of results) {
      const sim = nameSimilarity(place.name, venue.name)
      if (sim > bestScore && sim >= MIN_NAME_SIMILARITY) {
        bestScore = sim
        bestMatch = venue
      }
    }

    if (!bestMatch) {
      cacheSet(cacheKey, NEGATIVE_SENTINEL, 3600)
      return null
    }

    const match: FsqMatch = {
      fsq: normalizeFsqVenue(bestMatch),
      address: bestMatch.location?.formatted_address,
    }
    cacheSet(cacheKey, match, 3600)
    return match
  } catch (err) {
    console.warn(`FSQ search failed for "${place.name}":`, err)
    return null
  }
}

// ---------- Batch enrichment ----------

/**
 * Enrich a batch of PlaceBase with Foursquare free-tier data
 * (standardized categories + address fallback). Concurrency-limited.
 */
export async function enrichPlaces(places: PlaceBase[]): Promise<PlaceCard[]> {
  const CONCURRENCY = 5
  const results: PlaceCard[] = []

  for (let i = 0; i < places.length; i += CONCURRENCY) {
    const batch = places.slice(i, i + CONCURRENCY)
    const enriched = await Promise.all(
      batch.map(async (place) => {
        const match = await searchFsqVenue(place)
        const card: PlaceCard = { ...place, fsq: match?.fsq ?? undefined }
        // Fill address from FSQ only if OSM didn't provide one
        if (!card.address && match?.address) card.address = match.address
        return card
      })
    )
    results.push(...enriched)
  }

  return results
}

// ---------- Photo URL helper (kept for compatibility) ----------

export function getFsqPhotoUrl(
  photo: { prefix: string; suffix: string },
  size: `${number}x${number}` = '400x300'
): string {
  return `${photo.prefix}${size}${photo.suffix}`
}
