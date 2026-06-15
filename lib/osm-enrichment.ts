// ============================================================
// lib/osm-enrichment.ts — Deep OSM tag extraction
// Extracts ALL useful data from OSM tags that we currently ignore
// This is free, instant, no API calls needed.
// ============================================================

import type { OsmTags, OsmEnrichedData } from '@/types'
import { isOpenNow, getTodayHours } from './opening-hours'

// `OsmEnrichedData` is defined once in types/index.ts (single source of
// truth). Re-exported here so existing `./osm-enrichment` type imports
// (e.g. lib/overpass.ts) keep resolving.
export type { OsmEnrichedData }

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
