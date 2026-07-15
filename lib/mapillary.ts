// ============================================================
// lib/mapillary.ts — free street-level photos (server-side only).
//
// When a restaurant has no photo from any other source, we ask Mapillary for the
// nearest street image and use its storefront shot. Mapillary's coverage in
// cities is dense, so this fills most of the gaps. The thumbnails are served from
// *.fbcdn.net — already allow-listed in the CSP img-src — so the client loads
// them directly, no proxy needed.
//
// Needs a free client token (MAPILLARY_TOKEN, "MLY|…"). Absent → every call
// returns null and the feature degrades silently, exactly like Foursquare.
// ============================================================
import { cacheGet, cacheSet } from '@/lib/cache'

const GRAPH = 'https://graph.mapillary.com/images'
/** ~75 m box — wide enough to catch coverage on the block, then we keep the
 *  image physically closest to the venue (a bare bbox+limit=1 returns a random
 *  image inside the box, not the nearest). */
const HALF_DEG = 0.0007
/** Signed thumbnail URLs stay valid ~30 days (fbcdn `oe=`), so cache that long. */
const TTL = 60 * 60 * 24 * 30

interface MapillaryImage {
  thumb_1024_url?: string
  geometry?: { coordinates?: [number, number] } // [lon, lat]
}
interface MapillaryResponse {
  data?: MapillaryImage[]
}

/** Squared planar distance — fine for ranking a handful of points ~75 m apart. */
function dist2(aLon: number, aLat: number, bLon: number, bLat: number): number {
  return (aLon - bLon) ** 2 + (aLat - bLat) ** 2
}

/** Round coordinates so nearby lookups share one cache entry (and one API call). */
function key(lat: number, lon: number): string {
  return `mly:${lat.toFixed(4)},${lon.toFixed(4)}`
}

/**
 * Nearest Mapillary street thumbnail to a point, or null.
 * Cached (30 days) and safe to call in a batch: a missing token, a network
 * error, or no coverage all resolve to null without throwing.
 */
export async function nearestMapillaryThumb(lat: number, lon: number): Promise<string | null> {
  const token = process.env.MAPILLARY_TOKEN
  if (!token) return null

  const k = key(lat, lon)
  const cached = cacheGet<string | null>(k)
  if (cached !== null) return cached || null

  const bbox = [lon - HALF_DEG, lat - HALF_DEG, lon + HALF_DEG, lat + HALF_DEG].join(',')
  const url = `${GRAPH}?fields=thumb_1024_url,geometry&bbox=${bbox}&limit=12`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `OAuth ${token}` },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) {
      cacheSet(k, '', TTL) // remember the miss so we don't hammer on every pan
      return null
    }
    const json = (await res.json()) as MapillaryResponse
    const candidates = (json.data ?? []).filter((i) => i.thumb_1024_url)
    // Keep the image physically closest to the venue.
    let best: MapillaryImage | null = null
    let bestD = Infinity
    for (const img of candidates) {
      const c = img.geometry?.coordinates
      const d = c ? dist2(lon, lat, c[0], c[1]) : Infinity
      if (d < bestD) {
        bestD = d
        best = img
      }
    }
    const thumb = best?.thumb_1024_url ?? candidates[0]?.thumb_1024_url ?? ''
    cacheSet(k, thumb, TTL)
    return thumb || null
  } catch {
    return null
  }
}
