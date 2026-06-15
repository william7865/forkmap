import { describe, it, expect } from 'vitest'
import { pickSurprise, moodAffinity, buildReasons, MOODS } from '@/lib/surprise'
import type { PlaceCard } from '@/types'

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

/** Deterministic rng that always returns a fixed value. */
const rng = (v: number) => () => v

// ---------- pickSurprise: basics ----------

describe('pickSurprise', () => {
  it('returns null for an empty pool', () => {
    expect(pickSurprise([], {}, rng(0))).toBeNull()
  })

  it('returns a place + reasons for a non-empty pool', () => {
    const res = pickSurprise([makePlace()], {}, rng(0))
    expect(res).not.toBeNull()
    expect(res!.place.osm_id).toBe('node/1')
    expect(Array.isArray(res!.reasons)).toBe(true)
  })

  it('excludes already-seen ids (Set form)', () => {
    const places = [makePlace({ osm_id: 'node/1' }), makePlace({ osm_id: 'node/2' })]
    const res = pickSurprise(places, { exclude: new Set(['node/1']) }, rng(0))
    expect(res!.place.osm_id).toBe('node/2')
  })

  it('excludes already-seen ids (array form)', () => {
    const places = [makePlace({ osm_id: 'node/1' }), makePlace({ osm_id: 'node/2' })]
    const res = pickSurprise(places, { exclude: ['node/2'] }, rng(0))
    expect(res!.place.osm_id).toBe('node/1')
  })

  it('returns null when every place is excluded', () => {
    const places = [makePlace({ osm_id: 'node/1' })]
    expect(pickSurprise(places, { exclude: ['node/1'] }, rng(0))).toBeNull()
  })
})

// ---------- pickSurprise: constraints ----------

describe('pickSurprise constraints', () => {
  it('filters out closed places when openNow is set', () => {
    const places = [
      makePlace({ osm_id: 'node/1', open_now: false }),
      makePlace({ osm_id: 'node/2', open_now: true }),
    ]
    const res = pickSurprise(places, { openNow: true }, rng(0))
    expect(res!.place.osm_id).toBe('node/2')
  })

  it('respects maxPrice but keeps unknown prices (inclusive)', () => {
    const places = [
      makePlace({ osm_id: 'expensive', fsq: { fsq_id: 'a', price: 4 } }),
      makePlace({ osm_id: 'unknown' }), // no price → kept
    ]
    const res = pickSurprise(places, { maxPrice: 2 }, rng(0))
    expect(res!.place.osm_id).toBe('unknown')
  })

  it('respects maxDistance but keeps unknown distances (inclusive)', () => {
    const places = [
      makePlace({ osm_id: 'far', distance: 5000 }),
      makePlace({ osm_id: 'unknown-dist' }), // no distance → kept
    ]
    const res = pickSurprise(places, { maxDistance: 1000 }, rng(0))
    expect(res!.place.osm_id).toBe('unknown-dist')
  })

  it('returns null when constraints eliminate everything', () => {
    const places = [makePlace({ osm_id: 'closed', open_now: false })]
    expect(pickSurprise(places, { openNow: true }, rng(0))).toBeNull()
  })
})

// ---------- weighted selection ----------

describe('pickSurprise weighting', () => {
  it('picks the top-weighted place when rng=0', () => {
    const places = [
      makePlace({ osm_id: 'low', score: 0.1 }),
      makePlace({ osm_id: 'high', score: 0.9 }),
    ]
    const res = pickSurprise(places, {}, rng(0))
    expect(res!.place.osm_id).toBe('high')
  })

  it('can pick a lower-weighted place when rng is near 1', () => {
    const places = [
      makePlace({ osm_id: 'high', score: 0.9 }),
      makePlace({ osm_id: 'low', score: 0.5 }),
    ]
    // rng≈1 walks to the end of the weighted list → the lower one
    const res = pickSurprise(places, {}, rng(0.999))
    expect(res!.place.osm_id).toBe('low')
  })
})

// ---------- moodAffinity ----------

describe('moodAffinity', () => {
  it('is 0 when no mood is provided', () => {
    expect(moodAffinity(makePlace({ cuisine: 'Pizza' }), {})).toBe(0)
  })

  it('rewards a cuisine matching the comfort mood', () => {
    const pizza = makePlace({ cuisine: 'Pizza' })
    const salad = makePlace({ cuisine: 'Salade' })
    expect(moodAffinity(pizza, { mood: 'comfort' })).toBeGreaterThan(
      moodAffinity(salad, { mood: 'comfort' })
    )
  })

  it('rewards close + open places for the fast mood', () => {
    const closeOpen = makePlace({ cuisine: 'Burger', open_now: true, distance: 200 })
    const farClosed = makePlace({ cuisine: 'Burger', open_now: false, distance: 5000 })
    expect(moodAffinity(closeOpen, { mood: 'fast' })).toBeGreaterThan(
      moodAffinity(farClosed, { mood: 'fast' })
    )
  })

  it('discovery rewards cuisines the user does not already favorite', () => {
    const known = makePlace({ cuisine: 'Italien' })
    const novel = makePlace({ cuisine: 'Éthiopien' })
    const opts = { mood: 'discovery' as const, knownCuisines: ['italien'] }
    expect(moodAffinity(novel, opts)).toBeGreaterThan(moodAffinity(known, opts))
  })

  it('biases the pick toward the mood', () => {
    const places = [
      makePlace({ osm_id: 'pizza', cuisine: 'Pizza', score: 0.4 }),
      makePlace({ osm_id: 'salad', cuisine: 'Salade', score: 0.4 }),
    ]
    // Equal base score; comfort affinity should make pizza the top weight (rng=0).
    const res = pickSurprise(places, { mood: 'comfort' }, rng(0))
    expect(res!.place.osm_id).toBe('pizza')
  })
})

// ---------- buildReasons ----------

describe('buildReasons', () => {
  it('flags a top-rated place as a coup de cœur', () => {
    const reasons = buildReasons(makePlace({ fsq: { fsq_id: 'a', rating: 9.1 } }), {})
    expect(reasons.some((r) => r.includes('Coup de cœur'))).toBe(true)
  })

  it('mentions open-now and walk time', () => {
    const reasons = buildReasons(makePlace({ open_now: true, distance: 400 }), {})
    expect(reasons).toContain('Ouvert maintenant')
    expect(reasons.some((r) => r.includes('min à pied'))).toBe(true)
  })

  it('never returns more than 3 chips', () => {
    const reasons = buildReasons(
      makePlace({
        open_now: true,
        distance: 400,
        cuisine: 'Italien',
        fsq: { fsq_id: 'a', rating: 9.5 },
        osm_enriched: { michelin: 2 },
      }),
      { mood: 'comfort' }
    )
    expect(reasons.length).toBeLessThanOrEqual(3)
  })
})

// ---------- MOODS metadata ----------

describe('MOODS', () => {
  it('exposes 5 moods with labels and emoji', () => {
    expect(MOODS).toHaveLength(5)
    for (const m of MOODS) {
      expect(m.label.length).toBeGreaterThan(0)
      expect(m.emoji.length).toBeGreaterThan(0)
    }
  })
})
