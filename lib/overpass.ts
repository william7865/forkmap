// ============================================================
// lib/overpass.ts — Overpass API client + OSM normalizer
// ============================================================

import type { PlaceBase, OsmTags, OverpassParams } from '@/types'
import { isOpenNow } from './opening-hours'
import { extractOsmEnrichment } from './osm-enrichment'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

const TIMEOUT_MS = 15_000

// ---------- Overpass QL builder ----------

/**
 * Build an Overpass QL query for amenities within a bounding box.
 * Uses 'out center' so ways/relations return a center coordinate.
 */
export function buildOverpassQuery(params: OverpassParams): string {
  const { minLat, minLon, maxLat, maxLon, includeTypes = ['restaurant'] } = params
  const bbox = `${minLat},${minLon},${maxLat},${maxLon}`

  const amenityFilters = includeTypes
    .map(
      (type) => `
    node["amenity"="${type}"](${bbox});
    way["amenity"="${type}"](${bbox});
    relation["amenity"="${type}"](${bbox});`
    )
    .join('\n')

  return `
[out:json][timeout:25];
(
${amenityFilters}
);
out center tags;
`.trim()
}

// ---------- Fetch with fallback ----------

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: OsmTags
}

interface OverpassResponse {
  elements: OverpassElement[]
}

/**
 * Fetch from Overpass, RACING all endpoints in parallel and taking the first
 * that responds. Public Overpass mirrors have wildly variable load (one may be
 * <1s while another hangs for 20s), so sequential fallback made a slow/dead
 * first mirror block the whole request. Racing = as fast as the fastest mirror.
 * Losing requests are aborted once a winner returns.
 */
export async function fetchOverpass(query: string): Promise<OverpassResponse> {
  const controllers = OVERPASS_ENDPOINTS.map(() => new AbortController())

  const attempts = OVERPASS_ENDPOINTS.map(async (endpoint, i) => {
    const timer = setTimeout(() => controllers[i].abort(), TIMEOUT_MS)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': 'Forkmap/1.0 (https://forkmap.vercel.app)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controllers[i].signal,
      })
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status} from ${endpoint}`)
      return (await res.json()) as OverpassResponse
    } finally {
      clearTimeout(timer)
    }
  })

  try {
    const winner = await Promise.any(attempts)
    // Cancel the still-running losers to free sockets.
    controllers.forEach((c) => c.abort())
    return winner
  } catch {
    controllers.forEach((c) => c.abort())
    throw new Error('All Overpass endpoints failed')
  }
}

// ---------- Normalizer ----------

/**
 * Map OSM cuisine tag to a normalized display label.
 * Handles semicolon-separated values (e.g. "italian;pizza").
 */
function normalizeCuisine(raw?: string): string | undefined {
  if (!raw) return undefined
  const first = raw.split(';')[0].trim().toLowerCase()
  const MAP: Record<string, string> = {
    italian: 'Italian',
    pizza: 'Pizza',
    french: 'French',
    japanese: 'Japanese',
    sushi: 'Sushi',
    chinese: 'Chinese',
    indian: 'Indian',
    mexican: 'Mexican',
    burger: 'Burger',
    american: 'American',
    thai: 'Thai',
    kebab: 'Kebab',
    mediterranean: 'Mediterranean',
    greek: 'Greek',
    vietnamese: 'Vietnamese',
    korean: 'Korean',
    seafood: 'Seafood',
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    turkish: 'Turkish',
    lebanese: 'Lebanese',
  }
  return MAP[first] ?? first.charAt(0).toUpperCase() + first.slice(1)
}

/**
 * Reconstruct a human-readable address from OSM tags.
 */
function buildAddress(tags: OsmTags): string | undefined {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:postcode'],
    tags['addr:city'],
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : undefined
}

/**
 * Normalize a raw Overpass element into a PlaceBase.
 * Returns null if the element has no name or coordinates.
 */
export function normalizeElement(el: OverpassElement): PlaceBase | null {
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  const tags = el.tags ?? {}
  const name = tags['name']

  if (!lat || !lon || !name) return null

  const osmId = `${el.type}/${el.id}`
  const osmEnriched = extractOsmEnrichment(tags)

  return {
    osm_id: osmId,
    osm_type: el.type,
    name,
    lat,
    lon,
    tags,
    cuisine: normalizeCuisine(tags['cuisine']),
    opening_hours: tags['opening_hours'],
    // Parse opening hours at source — no Foursquare needed
    open_now:
      osmEnriched.open_now ??
      (tags['opening_hours'] ? (isOpenNow(tags['opening_hours']) ?? undefined) : undefined),
    website: tags['website'] ?? tags['contact:website'],
    phone: tags['phone'] ?? tags['contact:phone'],
    address: buildAddress(tags),
    // Pre-attach OSM enrichment so it's immediately available
    osm_enriched: osmEnriched,
  } as PlaceBase & { osm_enriched?: import('./osm-enrichment').OsmEnrichedData }
}

// ---------- Main export ----------

/**
 * Fetch and normalize restaurants in a bbox.
 * Automatically reduces bbox if response would be too large.
 */
export async function getRestaurantsInBbox(params: OverpassParams): Promise<PlaceBase[]> {
  const query = buildOverpassQuery(params)

  try {
    const response = await fetchOverpass(query)
    const places = response.elements.map(normalizeElement).filter((p): p is PlaceBase => p !== null)

    // Deduplicate by osm_id (shouldn't happen but safety net)
    const seen = new Set<string>()
    return places.filter((p) => {
      if (seen.has(p.osm_id)) return false
      seen.add(p.osm_id)
      return true
    })
  } catch (err) {
    console.error('getRestaurantsInBbox error:', err)
    throw err
  }
}
