// ============================================================
// lib/google-client.ts — CLIENT-SIDE Google enrichment (native only).
//   Scrapes Google Maps for rating/photos/hours directly from the DEVICE
//   (residential IP → not blocked, unlike the Vercel server IP). Returns the
//   same {...place, fsq} shape as /api/places/enrich-google so useRestaurants
//   merges it identically. On web it no-ops (caller uses the server route).
// ============================================================

import type { PlaceCard } from '@/types'
import { isNativeRuntime } from '@/lib/native/platform'
import { nativeHttpGetText } from '@/lib/native/http'
import { buildScrapeUrl, matchScrapeBody, SCRAPE_HEADERS } from '@/lib/google-scrape'

/** True when device-side scraping is possible (native app). */
export function canScrapeOnDevice(): boolean {
  return isNativeRuntime()
}

/** Max simultaneous device→Google requests (stay light per device). */
const CONCURRENCY = 4

async function scrapeOne(place: PlaceCard): Promise<PlaceCard> {
  try {
    const url = buildScrapeUrl(place.name, place.lat, place.lon)
    const res = await nativeHttpGetText(url, SCRAPE_HEADERS)
    if (!res || res.status !== 200) return place
    const fsq = matchScrapeBody(place.name, res.data)
    if (!fsq) return place
    // Merge scraped rich fields onto any existing FSQ (keep FSQ categories).
    return { ...place, fsq: { ...place.fsq, ...fsq, categories: place.fsq?.categories } }
  } catch {
    return place
  }
}

/**
 * Enrich places by scraping Google from the device. Returns places (unchanged
 * ones passed through). No-op on web.
 */
export async function enrichPlacesViaScrape(places: PlaceCard[]): Promise<PlaceCard[]> {
  if (!isNativeRuntime() || places.length === 0) return places

  const out: PlaceCard[] = new Array(places.length)
  let next = 0
  async function worker() {
    while (next < places.length) {
      const i = next++
      out[i] = await scrapeOne(places[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, places.length) }, worker))
  return out
}
