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
/** ~45 m box around the point — close enough that the image faces this venue. */
const HALF_DEG = 0.0004
const TTL = 60 * 60 * 24 * 30 // 30 days: street imagery barely changes.

interface MapillaryImage {
  thumb_1024_url?: string
}
interface MapillaryResponse {
  data?: MapillaryImage[]
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
  const url = `${GRAPH}?fields=thumb_1024_url&bbox=${bbox}&limit=1`

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
    const thumb = json.data?.[0]?.thumb_1024_url ?? ''
    cacheSet(k, thumb, TTL)
    return thumb || null
  } catch {
    return null
  }
}
