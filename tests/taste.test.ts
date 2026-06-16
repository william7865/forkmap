import { describe, it, expect } from 'vitest'
import {
  emptyProfile,
  recordSave,
  recordPass,
  tasteBoost,
  isMadeForYou,
  cuisineKeys,
  TASTE_MAX_BIAS,
} from '@/lib/taste'
import type { PlaceCard } from '@/types'

function makePlace(overrides: Partial<PlaceCard> = {}): PlaceCard {
  return {
    osm_id: 'node/1',
    osm_type: 'node',
    name: 'Test',
    lat: 48.8566,
    lon: 2.3522,
    tags: {},
    ...overrides,
  }
}

describe('cuisineKeys', () => {
  it('collects cuisine + FSQ categories, lowercased & deduped', () => {
    const p = makePlace({
      cuisine: 'Italien',
      fsq: {
        fsq_id: 'a',
        categories: [
          { id: 1, name: 'Pizza' },
          { id: 2, name: 'Italien' },
        ],
      },
    })
    expect(cuisineKeys(p).sort()).toEqual(['italien', 'pizza'])
  })

  it('returns [] when no cuisine info', () => {
    expect(cuisineKeys(makePlace())).toEqual([])
  })
})

describe('recordSave / recordPass', () => {
  it('save raises affinity, pass lowers it', () => {
    const pizza = makePlace({ cuisine: 'Pizza' })
    const saved = recordSave(emptyProfile(), pizza)
    expect(saved.cuisines['pizza']).toBeGreaterThan(0)
    const passed = recordPass(emptyProfile(), pizza)
    expect(passed.cuisines['pizza']).toBeLessThan(0)
  })

  it('is immutable (returns a new profile)', () => {
    const base = emptyProfile()
    const next = recordSave(base, makePlace({ cuisine: 'Pizza' }))
    expect(base.cuisines).toEqual({})
    expect(next).not.toBe(base)
  })

  it('clamps affinity after many saves', () => {
    let profile = emptyProfile()
    const pizza = makePlace({ cuisine: 'Pizza' })
    for (let i = 0; i < 50; i++) profile = recordSave(profile, pizza)
    expect(profile.cuisines['pizza']).toBeLessThanOrEqual(5)
  })

  it('ignores places with no cuisine', () => {
    const next = recordSave(emptyProfile(), makePlace())
    expect(next.cuisines).toEqual({})
  })
})

describe('tasteBoost', () => {
  it('is 0 for an empty profile', () => {
    expect(tasteBoost(emptyProfile(), makePlace({ cuisine: 'Pizza' }))).toBe(0)
  })

  it('is positive for liked cuisines, negative for disliked, within bounds', () => {
    let profile = emptyProfile()
    profile = recordSave(profile, makePlace({ cuisine: 'Pizza' }))
    const boost = tasteBoost(profile, makePlace({ cuisine: 'Pizza' }))
    expect(boost).toBeGreaterThan(0)
    expect(boost).toBeLessThanOrEqual(TASTE_MAX_BIAS)

    let disliked = emptyProfile()
    for (let i = 0; i < 5; i++) disliked = recordPass(disliked, makePlace({ cuisine: 'Sushi' }))
    const neg = tasteBoost(disliked, makePlace({ cuisine: 'Sushi' }))
    expect(neg).toBeLessThan(0)
    expect(neg).toBeGreaterThanOrEqual(-TASTE_MAX_BIAS)
  })
})

describe('isMadeForYou', () => {
  it('flags strongly-liked cuisines', () => {
    let profile = emptyProfile()
    const pizza = makePlace({ cuisine: 'Pizza' })
    for (let i = 0; i < 5; i++) profile = recordSave(profile, pizza)
    expect(isMadeForYou(profile, pizza)).toBe(true)
  })

  it('does not flag unknown cuisines', () => {
    expect(isMadeForYou(emptyProfile(), makePlace({ cuisine: 'Pizza' }))).toBe(false)
  })
})
