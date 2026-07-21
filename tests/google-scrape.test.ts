import { describe, it, expect } from 'vitest'
import {
  buildScrapeUrl,
  scrapeIsBlocked,
  matchScrapeBody,
  parseScrapeResults,
} from '@/lib/google-scrape'

// Build a minimal Google-map place node (entry[14]): p[11]=name, p[4][7]=rating,
// p[10]=id, p[9]=[.., .., lat, lon].
function makeEntry(
  name: string,
  rating?: number,
  lat?: number,
  lon?: number,
  address?: string
): unknown[] {
  const p: unknown[] = []
  const ratingArr: unknown[] = []
  if (rating != null) ratingArr[7] = rating
  p[4] = ratingArr
  if (lat != null && lon != null) p[9] = [null, null, lat, lon]
  p[10] = 'fsq-id'
  p[11] = name
  if (address != null) p[39] = address
  const entry: unknown[] = []
  entry[14] = p
  return entry
}

function makeBody(name: string, rating?: number): string {
  const data = [[null, [makeEntry(name, rating)]]]
  return ")]}'\n" + JSON.stringify(data)
}

function makeSearchBody(entries: [string, number, number, number][]): string {
  const data = [[null, entries.map(([n, r, la, lo]) => makeEntry(n, r, la, lo))]]
  return ")]}'\n" + JSON.stringify(data)
}

describe('buildScrapeUrl', () => {
  it('targets the tbm=map endpoint with the place name and a pb viewport', () => {
    const url = buildScrapeUrl('Le Comptoir', 48.8566, 2.3522)
    expect(url).toContain('tbm=map')
    expect(url).toContain('q=Le+Comptoir')
    expect(url).toContain('2d2.3522')
    expect(url).toContain('3d48.8566')
  })
})

describe('scrapeIsBlocked', () => {
  it('is false for a normal data blob', () => {
    expect(scrapeIsBlocked(")]}'\n[[]]")).toBe(false)
  })
  it('is true without the XSSI prefix, or on a consent/sorry wall', () => {
    expect(scrapeIsBlocked('<!doctype html>')).toBe(true)
    expect(scrapeIsBlocked(")]}'\nplease visit consent.google.com")).toBe(true)
    expect(scrapeIsBlocked(")]}'\n/sorry/index?continue")).toBe(true)
  })
})

describe('matchScrapeBody', () => {
  it('returns null for a blocked body', () => {
    expect(matchScrapeBody('X', '<!doctype html>')).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(matchScrapeBody('X', ")]}'\nnot json")).toBeNull()
  })

  it('maps a matching entry to FoursquareData with a 0–10 rating', () => {
    const fsq = matchScrapeBody('Le Comptoir', makeBody('Le Comptoir', 4.5))
    expect(fsq).not.toBeNull()
    expect(fsq!.rating).toBe(9) // 4.5/5 → 9/10
  })

  it('returns null when no entry name is similar enough', () => {
    expect(matchScrapeBody('Completely Different', makeBody('Le Comptoir', 4.5))).toBeNull()
  })
})

describe('parseScrapeResults', () => {
  it('returns all results with coords, preserving order', () => {
    const body = makeSearchBody([
      ['Le Comptoir', 4.6, 48.85, 2.34],
      ['Chez Denise', 4.2, 48.86, 2.35],
    ])
    const results = parseScrapeResults(body)
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ name: 'Le Comptoir', lat: 48.85, lon: 2.34 })
    expect(results[0].fsq.rating).toBe(9.2)
    expect(results[1].name).toBe('Chez Denise')
  })

  it('skips entries without coordinates', () => {
    const body = ")]}'\n" + JSON.stringify([[null, [makeEntry('No Coords', 4.0)]]])
    expect(parseScrapeResults(body)).toHaveLength(0)
  })

  it("extrait l'adresse formatée (p[39]) — distingue les homonymes", () => {
    const body =
      ")]}'\n" +
      JSON.stringify([
        [
          null,
          [
            makeEntry('Gangnam', 4.4, 48.87, 2.38, '36 Rue de Belleville, 75020 Paris'),
            makeEntry('Gangnam', 4.1, 48.85, 2.35, '12 Rue Montmartre, 75002 Paris'),
          ],
        ],
      ])
    const results = parseScrapeResults(body)
    expect(results[0].address).toBe('36 Rue de Belleville, 75020 Paris')
    expect(results[1].address).toBe('12 Rue Montmartre, 75002 Paris')
  })

  it("laisse l'adresse indéfinie quand p[39] manque", () => {
    const body = makeSearchBody([['Le Comptoir', 4.6, 48.85, 2.34]])
    expect(parseScrapeResults(body)[0].address).toBeUndefined()
  })

  it('returns [] when blocked', () => {
    expect(parseScrapeResults('<!doctype html>')).toEqual([])
  })
})
