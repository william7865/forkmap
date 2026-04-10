import { describe, it, expect } from 'vitest'
import {
  haversineDistance,
  computeScore,
  applyFilters,
  extractCuisines,
} from '@/lib/scoring'
import type { PlaceCard, FilterState } from '@/types'

// ---------- Helpers ----------

function makePlace(overrides: Partial<PlaceCard> = {}): PlaceCard {
  return {
    osm_id: 'node/1',
    osm_type: 'node',
    name: 'Test Restaurant',
    lat: 48.8566,
    lon: 2.3522,
    tags: {},
    ...overrides,
  }
}

const defaultFilters: FilterState = { sortBy: 'score' }

// ---------- haversineDistance ----------

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0)
  })

  it('returns ~111km per degree of latitude', () => {
    const dist = haversineDistance(0, 0, 1, 0)
    expect(dist).toBeCloseTo(111_195, -2)
  })

  it('is symmetric', () => {
    const a = haversineDistance(48.8, 2.3, 51.5, -0.1)
    const b = haversineDistance(51.5, -0.1, 48.8, 2.3)
    expect(a).toBeCloseTo(b, 0)
  })
})

// ---------- computeScore ----------

describe('computeScore', () => {
  it('returns a value between 0 and 1', () => {
    const score = computeScore(makePlace())
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('is higher for a verified place with a good rating', () => {
    const good = makePlace({
      fsq: { fsq_id: 'a', rating: 9, verified: true, total_ratings: 400, photos: [], categories: [] },
    })
    const plain = makePlace()
    expect(computeScore(good)).toBeGreaterThan(computeScore(plain))
  })

  it('open_now bonus is applied', () => {
    const open = makePlace({ open_now: true })
    const closed = makePlace({ open_now: false })
    expect(computeScore(open)).toBeGreaterThan(computeScore(closed))
  })
})

// ---------- applyFilters ----------

const places: PlaceCard[] = [
  makePlace({
    osm_id: 'a',
    name: 'Chez Pierre',
    cuisine: 'french',
    distance: 300,
    fsq: { fsq_id: 'x', rating: 8, price: 2, total_ratings: 100, verified: false, photos: [], categories: [] },
  }),
  makePlace({
    osm_id: 'b',
    name: 'Sushi Yuki',
    cuisine: 'japanese',
    distance: 800,
    fsq: { fsq_id: 'y', rating: 6, price: 3, total_ratings: 50, verified: false, photos: [], categories: [] },
  }),
  makePlace({
    osm_id: 'c',
    name: 'La Pizza',
    cuisine: 'italian',
    open_now: true,
    distance: 150,
  }),
]

describe('applyFilters', () => {
  it('returns all places with default filters', () => {
    expect(applyFilters(places, defaultFilters)).toHaveLength(3)
  })

  it('filters by minRating', () => {
    const result = applyFilters(places, { ...defaultFilters, minRating: 7 })
    result.forEach((p) => {
      if (p.fsq?.rating != null) expect(p.fsq.rating).toBeGreaterThanOrEqual(7)
    })
  })

  it('filters by maxPrice', () => {
    const result = applyFilters(places, { ...defaultFilters, maxPrice: 2 })
    expect(result.some((p) => p.osm_id === 'b')).toBe(false)
  })

  it('filters by cuisine (case-insensitive)', () => {
    const result = applyFilters(places, { ...defaultFilters, cuisine: 'french' })
    expect(result).toHaveLength(1)
    expect(result[0].osm_id).toBe('a')
  })

  it('filters openNow', () => {
    const result = applyFilters(places, { ...defaultFilters, openNow: true })
    expect(result.every((p) => p.open_now === true)).toBe(true)
  })

  it('filters by maxDistance', () => {
    const result = applyFilters(places, { ...defaultFilters, maxDistance: 400 })
    result.forEach((p) => {
      if (p.distance != null) expect(p.distance).toBeLessThanOrEqual(400)
    })
  })

  it('sorts by distance ascending', () => {
    const result = applyFilters(places, { ...defaultFilters, sortBy: 'distance' })
    const distances = result.map((p) => p.distance ?? 0)
    expect(distances).toEqual([...distances].sort((a, b) => a - b))
  })

  it('sorts by name alphabetically', () => {
    const result = applyFilters(places, { ...defaultFilters, sortBy: 'name' })
    const names = result.map((p) => p.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })
})

// ---------- extractCuisines ----------

describe('extractCuisines', () => {
  it('extracts unique cuisines, sorted', () => {
    const input = [
      makePlace({ cuisine: 'french' }),
      makePlace({ cuisine: 'japanese' }),
      makePlace({ cuisine: 'french' }),
    ]
    expect(extractCuisines(input)).toEqual(['french', 'japanese'])
  })

  it('includes FSQ category names', () => {
    const input = [
      makePlace({
        fsq: { fsq_id: 'x', categories: [{ id: 1, name: 'Bistro' }] },
      }),
    ]
    expect(extractCuisines(input)).toContain('Bistro')
  })

  it('returns empty array for empty input', () => {
    expect(extractCuisines([])).toEqual([])
  })
})
