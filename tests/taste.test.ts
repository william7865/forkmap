import { describe, it, expect } from 'vitest'
import {
  emptyProfile,
  recordSave,
  recordPass,
  tasteBoost,
  isMadeForYou,
  cuisineKeys,
  seedProfile,
  setDeclaredCuisines,
  TASTE_MAX_BIAS,
  TASTE_SEED_VALUE,
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

describe('seedProfile', () => {
  it('sets declared cuisines to the seed value', () => {
    const p = seedProfile(emptyProfile(), ['italian', 'sushi'])
    expect(p.cuisines['italian']).toBe(TASTE_SEED_VALUE)
    expect(p.cuisines['sushi']).toBe(TASTE_SEED_VALUE)
  })

  it('is additive — never lowers a stronger learned affinity', () => {
    const base = { cuisines: { pizza: 5 } }
    const p = seedProfile(base, ['pizza'])
    expect(p.cuisines['pizza']).toBe(5)
  })

  it('raises a weak learned affinity up to the seed value', () => {
    const p = seedProfile({ cuisines: { thai: 1 } }, ['thai'])
    expect(p.cuisines['thai']).toBe(TASTE_SEED_VALUE)
  })

  it('is immutable', () => {
    const base = emptyProfile()
    const next = seedProfile(base, ['italian'])
    expect(base.cuisines).toEqual({})
    expect(next).not.toBe(base)
  })

  it('makes a seeded single-cuisine place "made for you"', () => {
    const p = seedProfile(emptyProfile(), ['italian'])
    expect(isMadeForYou(p, makePlace({ cuisine: 'Italian' }))).toBe(true)
  })
})

describe('setDeclaredCuisines', () => {
  const OPTS = ['italian', 'sushi', 'thai']

  it('declares selected and retracts previously-declared unselected', () => {
    const base = { cuisines: { italian: TASTE_SEED_VALUE, sushi: TASTE_SEED_VALUE } }
    const p = setDeclaredCuisines(base, OPTS, ['italian', 'thai'])
    expect(p.cuisines['italian']).toBe(TASTE_SEED_VALUE) // kept
    expect(p.cuisines['thai']).toBe(TASTE_SEED_VALUE) // added
    expect(p.cuisines['sushi']).toBe(0) // retracted
  })

  it('leaves learned small/negative affinities untouched when unselected', () => {
    const base = { cuisines: { sushi: -2, thai: 1 } }
    const p = setDeclaredCuisines(base, OPTS, [])
    expect(p.cuisines['sushi']).toBe(-2)
    expect(p.cuisines['thai']).toBe(1)
  })

  it('is immutable', () => {
    const base = { cuisines: { italian: TASTE_SEED_VALUE } }
    const next = setDeclaredCuisines(base, OPTS, [])
    expect(base.cuisines['italian']).toBe(TASTE_SEED_VALUE)
    expect(next).not.toBe(base)
  })
})
