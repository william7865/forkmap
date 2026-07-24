// ============================================================
// lib/import/location.ts — pull the venue a creator TAGGED on the post out of the
// fetched page HTML. When a post carries a location (Instagram place sticker,
// TikTok POI, a JSON-LD Restaurant block) it names — and sometimes geolocates —
// the exact venue: the single most reliable signal there is. Pure, no network,
// fully testable against captured HTML fixtures. Best-effort: returns null when
// the page exposes no location (common), so it only ever ADDS a signal.
// ============================================================

import type { ImportPlatform } from '@/types'

export interface LocationTag {
  /** The venue/place name the creator tagged. */
  name: string
  /** City/locality when the source gives one. */
  city: string | null
  /** Coordinates, when present — the fast path to a certain resolution. */
  lat: number | null
  lon: number | null
}

const LDJSON = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
const PLACE_TYPES = new Set([
  'restaurant',
  'foodestablishment',
  'cafeorcoffeeshop',
  'barorpub',
  'bakery',
  'localbusiness',
  'place',
  'foodtruck',
])

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

function inRange(lat: number | null, lon: number | null): boolean {
  return lat != null && lon != null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
}

function clean(s: unknown): string {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : ''
}

/** Read a { name, geo, address } out of one JSON-LD node (handles @graph + arrays). */
function fromJsonLdNode(node: unknown): LocationTag | null {
  if (!node || typeof node !== 'object') return null
  const o = node as Record<string, unknown>

  // Unwrap @graph / arrays: recurse into children, first hit wins.
  const graph = o['@graph']
  if (Array.isArray(graph)) {
    for (const child of graph) {
      const hit = fromJsonLdNode(child)
      if (hit) return hit
    }
  }

  const rawType = o['@type']
  const types = (Array.isArray(rawType) ? rawType : [rawType])
    .map((t) => (typeof t === 'string' ? t.toLowerCase() : ''))
    .filter(Boolean)
  if (!types.some((t) => PLACE_TYPES.has(t))) return null

  const name = clean(o.name)
  if (!name) return null

  const geo = (o.geo ?? {}) as Record<string, unknown>
  const lat = num(geo.latitude)
  const lon = num(geo.longitude)
  const address = (o.address ?? {}) as Record<string, unknown>
  const city = clean(address.addressLocality) || null

  return { name, city, lat: inRange(lat, lon) ? lat : null, lon: inRange(lat, lon) ? lon : null }
}

/** Any <script type="application/ld+json"> Restaurant/Place block. */
function fromJsonLd(html: string): LocationTag | null {
  for (const m of html.matchAll(LDJSON)) {
    let parsed: unknown
    try {
      parsed = JSON.parse(m[1].trim())
    } catch {
      continue
    }
    const nodes = Array.isArray(parsed) ? parsed : [parsed]
    for (const node of nodes) {
      const hit = fromJsonLdNode(node)
      if (hit) return hit
    }
  }
  return null
}

/**
 * TikTok embeds a POI in its rehydration JSON: `"poi":{ "poiName":"…",
 * "address":"…" }`. Coordinates are rarely present, so this usually yields a
 * name-only tag (still a strong signal downstream).
 */
function fromTikTokPoi(html: string): LocationTag | null {
  const m = /"poi(?:Info)?"\s*:\s*(\{[^{}]*\})/i.exec(html)
  if (!m) return null
  let poi: Record<string, unknown>
  try {
    poi = JSON.parse(m[1]) as Record<string, unknown>
  } catch {
    return null
  }
  const name = clean(poi.poiName ?? poi.name)
  if (!name) return null
  const lat = num(poi.poiLat ?? poi.latitude ?? poi.lat)
  const lon = num(poi.poiLng ?? poi.longitude ?? poi.lng ?? poi.lon)
  const city = clean(poi.city) || null
  return { name, city, lat: inRange(lat, lon) ? lat : null, lon: inRange(lat, lon) ? lon : null }
}

/**
 * Instagram embeds a location sticker as `"location":{ "name":"…", "lat":…,
 * "lng":… }` (or `slug`). Coordinates are sometimes present.
 */
function fromInstagramLocation(html: string): LocationTag | null {
  const m = /"location"\s*:\s*(\{[^{}]*"name"[^{}]*\})/i.exec(html)
  if (!m) return null
  let loc: Record<string, unknown>
  try {
    loc = JSON.parse(m[1]) as Record<string, unknown>
  } catch {
    return null
  }
  const name = clean(loc.name)
  if (!name) return null
  const lat = num(loc.lat ?? loc.latitude)
  const lon = num(loc.lng ?? loc.longitude ?? loc.lon)
  return {
    name,
    city: null,
    lat: inRange(lat, lon) ? lat : null,
    lon: inRange(lat, lon) ? lon : null,
  }
}

/**
 * Best-effort venue location from a post's page HTML. JSON-LD (any platform, the
 * cleanest source) first, then the platform-specific embed. Null when the page
 * exposes no location — the common case, handled gracefully upstream.
 */
export function extractLocationTag(html: string, platform: ImportPlatform): LocationTag | null {
  if (!html) return null
  const ld = fromJsonLd(html)
  if (ld) return ld
  if (platform === 'tiktok') return fromTikTokPoi(html)
  if (platform === 'instagram') return fromInstagramLocation(html)
  return null
}
