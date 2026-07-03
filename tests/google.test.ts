import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import {
  googleRatingTo10,
  mapPriceLevel,
  parseSerpPrice,
  encodeGooglePhoto,
  serpPhoto,
  mapGoogleToFsq,
  mapSerpToFsq,
  parseScrapeBody,
  mapScrapeEntry,
  upsizeGooglePhotoUrl,
  googleBreakerOpen,
} from '@/lib/google'

// ---------- Shared mappers ----------

describe('googleRatingTo10', () => {
  it('converts the 0–5 rating scale to the app 0–10 scale', () => {
    expect(googleRatingTo10(4.5)).toBe(9)
    expect(googleRatingTo10(0)).toBe(0)
    expect(googleRatingTo10(3.7)).toBe(7.4)
  })

  it('returns undefined for missing / NaN input', () => {
    expect(googleRatingTo10(undefined)).toBeUndefined()
    expect(googleRatingTo10(NaN)).toBeUndefined()
  })
})

describe('mapPriceLevel', () => {
  it('maps the PRICE_LEVEL_* enum to 1–4', () => {
    expect(mapPriceLevel('PRICE_LEVEL_INEXPENSIVE')).toBe(1)
    expect(mapPriceLevel('PRICE_LEVEL_MODERATE')).toBe(2)
    expect(mapPriceLevel('PRICE_LEVEL_EXPENSIVE')).toBe(3)
    expect(mapPriceLevel('PRICE_LEVEL_VERY_EXPENSIVE')).toBe(4)
    expect(mapPriceLevel(undefined)).toBeUndefined()
  })
})

describe('parseSerpPrice', () => {
  it('counts $ signs into the 1–4 scale', () => {
    expect(parseSerpPrice('$')).toBe(1)
    expect(parseSerpPrice('$$$')).toBe(3)
    expect(parseSerpPrice('€€')).toBeUndefined()
    expect(parseSerpPrice(undefined)).toBeUndefined()
  })
})

// ---------- Photo encoders ----------

describe('encodeGooglePhoto', () => {
  it('encodes a Google photo ref into a same-origin proxy URL via prefix/suffix', () => {
    const photo = encodeGooglePhoto({ name: 'places/ABC/photos/XYZ', widthPx: 800, heightPx: 600 })
    const url = `${photo.prefix}600x400${photo.suffix}`
    expect(url).toBe('/api/places/google-photo?ref=places%2FABC%2Fphotos%2FXYZ&sz=600x400')
    expect(photo.width).toBe(800)
    expect(photo.height).toBe(600)
  })
})

describe('serpPhoto', () => {
  it('proxies a full image URL through the `u` param', () => {
    const photo = serpPhoto('https://lh5.googleusercontent.com/x')
    const url = `${photo.prefix}220x220${photo.suffix}`
    expect(url).toBe(
      '/api/places/google-photo?u=https%3A%2F%2Flh5.googleusercontent.com%2Fx&sz=220x220'
    )
  })
})

describe('upsizeGooglePhotoUrl', () => {
  it('bumps the …/s44-… size segment', () => {
    expect(upsizeGooglePhotoUrl('https://lh6.googleusercontent.com/a/s44-p-k/photo.jpg', 600)).toBe(
      'https://lh6.googleusercontent.com/a/s600-p-k/photo.jpg'
    )
  })
})

// ---------- Provider mappers ----------

describe('mapGoogleToFsq', () => {
  it('maps a Google place into the shared FoursquareData slot', () => {
    const fsq = mapGoogleToFsq({
      id: 'places/GID',
      rating: 4.0,
      userRatingCount: 320,
      priceLevel: 'PRICE_LEVEL_MODERATE',
      regularOpeningHours: { openNow: true, weekdayDescriptions: ['lundi: 12–14'] },
      photos: [{ name: 'places/GID/photos/P1', widthPx: 100, heightPx: 100 }],
    })
    expect(fsq.rating).toBe(8)
    expect(fsq.total_ratings).toBe(320)
    expect(fsq.price).toBe(2)
    expect(fsq.hours?.open_now).toBe(true)
    expect(fsq.photos).toHaveLength(1)
  })
})

describe('mapSerpToFsq', () => {
  it('maps a SerpAPI result, deriving open_now from open_state', () => {
    const fsq = mapSerpToFsq({
      place_id: 'PID',
      title: 'Chez X',
      rating: 4.5,
      reviews: 210,
      price: '$$',
      open_state: 'Open ⋅ Closes 11 PM',
      operating_hours: { monday: '12–2 PM' },
      thumbnail: 'https://lh5.googleusercontent.com/t',
    })
    expect(fsq.rating).toBe(9)
    expect(fsq.total_ratings).toBe(210)
    expect(fsq.price).toBe(2)
    expect(fsq.hours?.open_now).toBe(true)
    expect(fsq.photos).toHaveLength(1)
  })
})

// ---------- DIY scraper parser (real captured fixture) ----------

describe('scrape parser (real Google Maps pb fixture)', () => {
  const body = readFileSync('tests/fixtures/gmaps-scrape.txt', 'utf8')
  const entries = parseScrapeBody(body)

  it("parses the )]}' body into result entries", () => {
    expect(entries.length).toBe(2)
  })

  it('extracts name, rating, gps, photo and hours from a real entry', () => {
    const p = mapScrapeEntry(entries[0])
    expect(p?.name).toBe('Brasserie des Prés')
    expect(p?.fsq.rating).toBe(9.4) // 4.7 * 2
    expect(typeof p?.lat).toBe('number')
    expect(typeof p?.lon).toBe('number')
    expect(p?.fsq.photos?.[0].prefix).toContain('/api/places/google-photo?u=')
    expect(p?.fsq.hours).toBeDefined()
  })

  it('derives open_now from the French open-state string', () => {
    const closed = mapScrapeEntry(entries[1]) // "Fermé · Ouvre à 19:00"
    expect(closed?.name).toBe('Restaurant Aux Perchés')
    expect(closed?.fsq.hours?.open_now).toBe(false)
  })

  it('returns null for an entry with no place node', () => {
    expect(mapScrapeEntry([1, 2, 3])).toBeNull()
  })
})

describe('googleBreakerOpen', () => {
  it('starts closed', () => {
    expect(googleBreakerOpen()).toBe(false)
  })
})
