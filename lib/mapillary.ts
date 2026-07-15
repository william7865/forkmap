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
  compass_angle?: number // camera heading, degrees 0–360
}
interface MapillaryResponse {
  data?: MapillaryImage[]
}

/** Within this heading error (deg) the venue is considered "in front of" the
 *  camera — a storefront shot rather than a picture of the opposite pavement. */
const FACING_TOLERANCE = 60

/** Squared planar distance — fine for ranking a handful of points ~75 m apart. */
function dist2(aLon: number, aLat: number, bLon: number, bLat: number): number {
  return (aLon - bLon) ** 2 + (aLat - bLat) ** 2
}

/** Compass bearing (deg 0–360) from camera point to the venue. */
export function bearing(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const φ1 = (fromLat * Math.PI) / 180
  const φ2 = (toLat * Math.PI) / 180
  const Δλ = ((toLon - fromLon) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** Smallest angle (deg) between two headings. */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/** True when the camera roughly faces the venue (so it's likely in frame). */
function facesVenue(img: MapillaryImage, lat: number, lon: number): boolean {
  const c = img.geometry?.coordinates
  if (!c || typeof img.compass_angle !== 'number') return false
  return angleDiff(img.compass_angle, bearing(c[1], c[0], lat, lon)) <= FACING_TOLERANCE
}

/** Round coordinates so nearby lookups share one cache entry (and one API call). */
function key(lat: number, lon: number): string {
  return `mly:${lat.toFixed(4)},${lon.toFixed(4)}`
}

/**
 * Up to `max` Mapillary street thumbnails near a point, nearest first (deduped).
 * Cached (30 days) and safe to call in a batch: a missing token, a network
 * error, or no coverage all resolve to `[]` without throwing. Feeds the fiche
 * gallery when a place has no other photos.
 */
export async function nearestMapillaryThumbs(lat: number, lon: number, max = 3): Promise<string[]> {
  const token = process.env.MAPILLARY_TOKEN
  if (!token) return []

  const k = key(lat, lon)
  const cached = cacheGet<string[]>(k)
  if (Array.isArray(cached)) return cached.slice(0, max)

  const bbox = [lon - HALF_DEG, lat - HALF_DEG, lon + HALF_DEG, lat + HALF_DEG].join(',')
  const url = `${GRAPH}?fields=thumb_1024_url,geometry,compass_angle&bbox=${bbox}&limit=25`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `OAuth ${token}` },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) {
      cacheSet(k, [], TTL) // remember the miss so we don't hammer on every pan
      return []
    }
    const json = (await res.json()) as MapillaryResponse
    const candidates = (json.data ?? []).filter(
      (i): i is MapillaryImage & { thumb_1024_url: string } => !!i.thumb_1024_url
    )
    // Rank: shots whose camera FACES the venue first (the storefront is in
    // frame), then nearest. A picture of the opposite pavement outranks nothing.
    const d2 = (i: MapillaryImage) => {
      const c = i.geometry?.coordinates
      return c ? dist2(lon, lat, c[0], c[1]) : Infinity
    }
    candidates.sort((a, b) => {
      const fa = facesVenue(a, lat, lon) ? 0 : 1
      const fb = facesVenue(b, lat, lon) ? 0 : 1
      return fa - fb || d2(a) - d2(b)
    })
    const seen = new Set<string>()
    const thumbs = candidates
      .map((i) => i.thumb_1024_url)
      .filter((u) => (seen.has(u) ? false : (seen.add(u), true)))
    cacheSet(k, thumbs, TTL)
    return thumbs.slice(0, max)
  } catch {
    return []
  }
}

/** Nearest single Mapillary thumbnail, or null. Thin wrapper over the plural. */
export async function nearestMapillaryThumb(lat: number, lon: number): Promise<string | null> {
  return (await nearestMapillaryThumbs(lat, lon, 1))[0] ?? null
}
