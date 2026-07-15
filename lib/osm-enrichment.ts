// ============================================================
// lib/osm-enrichment.ts — Deep OSM tag extraction
// Extracts ALL useful data from OSM tags that we currently ignore
// This is free, instant, no API calls needed.
// ============================================================

import type { OsmTags, OsmEnrichedData, PlaceCard } from '@/types'
import { isOpenNow, getTodayHours } from './opening-hours'
import { extractMichelinFromTags } from './michelin'

// `OsmEnrichedData` is defined once in types/index.ts (single source of
// truth). Re-exported here so existing `./osm-enrichment` type imports
// (e.g. lib/overpass.ts) keep resolving.
export type { OsmEnrichedData }

/**
 * Best free photo URL from OSM tags. Prefers `wikimedia_commons` (a Commons file
 * → Special:FilePath, hotlink-friendly, CSP-allowed). Falls back to a raw `image`
 * tag ONLY when it points at Wikimedia — arbitrary hosts aren't in the CSP and
 * would render as broken images. Returns null when there's nothing usable.
 */
export function osmPhotoUrl(tags: OsmTags, width = 800): string | null {
  const commons = tags['wikimedia_commons']
  if (commons && /^file:/i.test(commons)) {
    const file = commons.replace(/^file:/i, '').trim()
    if (file) {
      return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`
    }
  }
  const image = tags['image']
  if (image && /^https:\/\/(upload|commons)\.wikimedia\.org\//i.test(image)) return image
  return null
}

function boolTag(tags: OsmTags, key: string): boolean | undefined {
  const v = tags[key]
  if (!v) return undefined
  if (v === 'yes' || v === 'true' || v === '1') return true
  if (v === 'no' || v === 'false' || v === '0') return false
  return undefined
}

export function extractOsmEnrichment(tags: OsmTags): OsmEnrichedData {
  const result: OsmEnrichedData = {}

  // ── Contact ─────────────────────────────────────────────
  result.email = tags['email'] ?? tags['contact:email']
  result.instagram = tags['contact:instagram']
  result.facebook = tags['contact:facebook']
  result.booking_url =
    tags['reservation'] !== 'no' ? (tags['booking'] ?? tags['reservation:url']) : undefined
  // Direct link to the menu when OSM has one — the closest thing to "what does
  // this place serve" that is free and reliable. `no` means explicitly no menu.
  const menuRaw = tags['menu'] ?? tags['website:menu'] ?? tags['contact:menu']
  if (menuRaw && menuRaw !== 'no' && /^https?:\/\//i.test(menuRaw)) result.menu_url = menuRaw

  // Free-text blurb (French preferred) — a real description on the fiche.
  const descRaw = tags['description:fr'] ?? tags['description']
  if (descRaw) {
    const desc = descRaw.trim()
    if (desc) result.description = desc.length > 600 ? `${desc.slice(0, 597).trimEnd()}…` : desc
  }

  // ── Features ────────────────────────────────────────────
  const outdoorRaw = boolTag(tags, 'outdoor_seating')
  if (outdoorRaw !== undefined) result.outdoor_seating = outdoorRaw

  const takeawayRaw = tags['takeaway']
  if (takeawayRaw) result.takeaway = takeawayRaw === 'yes' || takeawayRaw === 'only'

  const deliveryRaw = boolTag(tags, 'delivery')
  if (deliveryRaw !== undefined) result.delivery = deliveryRaw

  const wheelchair = tags['wheelchair'] as 'yes' | 'limited' | 'no' | undefined
  if (wheelchair) result.wheelchair = wheelchair

  const wifi = boolTag(tags, 'internet_access') ?? boolTag(tags, 'wifi')
  if (wifi !== undefined) result.wifi = wifi

  const res = boolTag(tags, 'reservation')
  if (res !== undefined) result.reservations = res

  const dogs = boolTag(tags, 'dog') ?? boolTag(tags, 'dogs')
  if (dogs !== undefined) result.dogs_allowed = dogs

  const music = boolTag(tags, 'live_music') ?? (tags['music'] === 'live' ? true : undefined)
  if (music !== undefined) result.live_music = music

  const ac = boolTag(tags, 'air_conditioning')
  if (ac !== undefined) result.air_conditioning = ac

  const drive = boolTag(tags, 'drive_through')
  if (drive !== undefined) result.drive_through = drive

  // ── Photo (free, from OSM tags) ──────────────────────────
  // A real photo of the venue when OSM has one. `wikimedia_commons` is a Commons
  // file; Special:FilePath 302-redirects to upload.wikimedia.org — both hosts are
  // already in the CSP img-src, so the browser loads it directly, no proxy.
  const img = osmPhotoUrl(tags)
  if (img) result.image_url = img

  // ── Classification ───────────────────────────────────────
  const stars = tags['stars'] ?? tags['michelin:stars'] ?? tags['award:michelin']
  if (stars) {
    const n = Number(stars)
    if (!isNaN(n)) result.michelin = n
  }

  const organic = boolTag(tags, 'organic')
  if (organic !== undefined) result.organic = organic

  // Diet
  const diets: string[] = []
  if (tags['diet:vegetarian'] === 'yes' || tags['diet:vegetarian'] === 'only')
    diets.push('vegetarian')
  if (tags['diet:vegan'] === 'yes' || tags['diet:vegan'] === 'only') diets.push('vegan')
  if (tags['diet:halal'] === 'yes') diets.push('halal')
  if (tags['diet:kosher'] === 'yes') diets.push('kosher')
  if (tags['diet:gluten_free'] === 'yes') diets.push('gluten_free')
  if (diets.length) result.diet = diets

  if (tags['diet:halal'] === 'yes') result.halal = true
  if (tags['diet:kosher'] === 'yes') result.kosher = true
  if (tags['diet:vegetarian'] === 'only') result.vegetarian_friendly = true

  // ── Capacity ─────────────────────────────────────────────
  const cap = tags['capacity'] ?? tags['seats']
  if (cap) {
    const n = Number(cap)
    if (!isNaN(n) && n > 0) result.capacity = n
  }

  // ── Opening hours ────────────────────────────────────────
  const oh = tags['opening_hours']
  if (oh) {
    const parsed = isOpenNow(oh)
    if (parsed !== null) result.open_now = parsed
    const today = getTodayHours(oh)
    if (today) result.today_hours = today
  }

  // ── Brand ────────────────────────────────────────────────
  result.brand = tags['brand']
  result.brand_wikidata = tags['brand:wikidata']

  // ── Payment ──────────────────────────────────────────────
  const payments: string[] = []
  if (boolTag(tags, 'payment:cash')) payments.push('cash')
  if (boolTag(tags, 'payment:credit_cards')) payments.push('card')
  if (boolTag(tags, 'payment:contactless')) payments.push('contactless')
  if (boolTag(tags, 'payment:bitcoin')) payments.push('bitcoin')
  if (payments.length) result.payment_methods = payments

  // ── Address details ──────────────────────────────────────
  result.postcode = tags['addr:postcode']
  result.city = tags['addr:city']
  result.district = tags['addr:suburb'] ?? tags['addr:quarter']
  result.floor = tags['level'] ?? tags['addr:floor']

  // Clean up undefined keys
  Object.keys(result).forEach((k) => {
    if ((result as Record<string, unknown>)[k] === undefined) {
      delete (result as Record<string, unknown>)[k]
    }
  })

  return result
}

/**
 * Client-side equivalent of POST /api/places/enrich-osm for the common
 * (deep=false, no wiki tag) path. The Overpass normalizer already attaches
 * `osm_enriched` + `open_now`; the only net-new data the server produced was
 * `today_hours` and the Michelin distinctions — both derivable from tags we
 * already hold. Computing them here lets us skip N HTTP round-trips per fetch.
 * Wiki-tagged places still go to the server for the Wikidata lookup.
 */
export function enrichOsmClient(place: PlaceCard): PlaceCard {
  const tags = (place.tags ?? {}) as OsmTags
  const osm_enriched: OsmEnrichedData = { ...(place.osm_enriched ?? {}) }

  const oh = place.opening_hours ?? tags['opening_hours']
  if (oh) {
    if (osm_enriched.open_now === undefined) {
      const openNow = isOpenNow(oh)
      if (openNow !== null) osm_enriched.open_now = openNow
    }
    const todayHours = getTodayHours(oh)
    if (todayHours) osm_enriched.today_hours = todayHours
  }

  const michelin = extractMichelinFromTags(tags)
  if (michelin.michelin_stars) osm_enriched.michelin = michelin.michelin_stars

  let wikidata = place.wikidata
  if (michelin.distinctions?.length) {
    wikidata = {
      ...(wikidata ?? {}),
      distinctions: [...(wikidata?.distinctions ?? []), ...michelin.distinctions],
    }
  }

  return {
    ...place,
    osm_enriched,
    wikidata,
    open_now: osm_enriched.open_now ?? place.open_now,
  }
}
