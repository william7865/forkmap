import { describe, it, expect } from 'vitest'
import { buildScrapeUrl, scrapeIsBlocked, matchScrapeBody } from '@/lib/google-scrape'

// Build a minimal Google-map-shaped response body: data[0][1] = entries,
// each entry[14] is the place node (p[11]=name, p[4][7]=rating, p[10]=id).
function makeBody(name: string, rating?: number): string {
  const p: unknown[] = []
  const ratingArr: unknown[] = []
  if (rating != null) ratingArr[7] = rating
  p[4] = ratingArr
  p[10] = 'fsq-id'
  p[11] = name
  const entry: unknown[] = []
  entry[14] = p
  const data = [[null, [entry]]]
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
