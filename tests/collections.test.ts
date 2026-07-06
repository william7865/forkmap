import { describe, it, expect } from 'vitest'
import { buildCollections } from '@/lib/collections'
import { emptyProfile, type TasteProfile } from '@/lib/taste'
import type { PlaceCard } from '@/types'

let seq = 0
function makePlace(overrides: Partial<PlaceCard> = {}): PlaceCard {
  seq += 1
  return {
    osm_id: `node/${seq}`,
    osm_type: 'node',
    name: `Place ${seq}`,
    lat: 48.8566,
    lon: 2.3522,
    tags: {},
    ...overrides,
  }
}

/** Convenience: a place with an FSQ rating + cuisine. */
function rated(rating: number, cuisine: string, extra: Partial<PlaceCard> = {}): PlaceCard {
  return makePlace({ cuisine, fsq: { fsq_id: `f${seq}`, rating }, ...extra })
}

function byId(cs: ReturnType<typeof buildCollections>, id: string) {
  return cs.find((c) => c.id === id)
}

describe('buildCollections — thresholds & empties', () => {
  it('drops collections with fewer than 3 places', () => {
    // Only 2 open places → "open" collection is not editorial enough.
    const places = [
      rated(8, 'Italian', { open_now: true, distance: 900 }),
      rated(7, 'French', { open_now: true, distance: 950 }),
      rated(6, 'Thai', { distance: 900 }),
    ]
    const cs = buildCollections(places, emptyProfile())
    expect(byId(cs, 'open')).toBeUndefined()
  })

  it('returns [] for an empty pool', () => {
    expect(buildCollections([], emptyProfile())).toEqual([])
  })
})

describe('buildCollections — predicates', () => {
  it('"Ouvert maintenant" holds only open places, sorted by distance', () => {
    const places = [
      rated(8, 'Italian', { open_now: true, distance: 900 }),
      rated(7, 'French', { open_now: true, distance: 300 }),
      rated(6, 'Thai', { open_now: true, distance: 600 }),
      rated(9, 'Sushi', { open_now: false, distance: 100 }),
    ]
    const open = byId(buildCollections(places, emptyProfile()), 'open')
    expect(open).toBeDefined()
    expect(open!.places.every((p) => p.open_now === true)).toBe(true)
    expect(open!.places.map((p) => p.distance)).toEqual([300, 600, 900])
  })

  it('"À deux pas" holds only places within 400 m', () => {
    const places = [
      rated(8, 'Italian', { distance: 120 }),
      rated(7, 'French', { distance: 350 }),
      rated(6, 'Thai', { distance: 399 }),
      rated(9, 'Sushi', { distance: 401 }),
    ]
    const walk = byId(buildCollections(places, emptyProfile()), 'walk')
    expect(walk).toBeDefined()
    expect(walk!.places.every((p) => (p.distance ?? 0) < 400)).toBe(true)
    expect(walk!.places).toHaveLength(3)
  })

  it('"Étoilés & distingués" holds only Michelin places', () => {
    const places = [
      rated(9, 'French', { wikidata: { michelin_stars: 2 } }),
      rated(8, 'Italian', { osm_enriched: { michelin: 1 } }),
      rated(9, 'Japanese', { wikidata: { michelin_stars: 1 } }),
      rated(7, 'Thai'),
    ]
    const m = byId(buildCollections(places, emptyProfile()), 'michelin')
    expect(m).toBeDefined()
    expect(m!.places).toHaveLength(3)
  })
})

describe('buildCollections — taste', () => {
  it('has no "Fait pour toi" for an empty taste profile', () => {
    const places = [rated(8, 'Italian'), rated(7, 'French'), rated(6, 'Thai')]
    expect(byId(buildCollections(places, emptyProfile()), 'for-you')).toBeUndefined()
  })

  it('surfaces taste-matched places when the profile likes a cuisine', () => {
    const taste: TasteProfile = { cuisines: { pizza: 5 } }
    const places = [
      rated(8, 'Pizza'),
      rated(7, 'Pizza'),
      rated(6, 'Pizza'),
      rated(9, 'Sushi'),
      rated(8, 'Thai'),
    ]
    const forYou = byId(buildCollections(places, taste), 'for-you')
    expect(forYou).toBeDefined()
    expect(forYou!.places.every((p) => p.cuisine === 'Pizza')).toBe(true)
  })
})

describe('buildCollections — {cuisine} du moment', () => {
  it('titles the rail after the most frequent cuisine', () => {
    const places = [
      rated(8, 'Italian'),
      rated(7, 'Italian'),
      rated(6, 'Italian'),
      rated(9, 'Thai'),
      rated(5, 'French'),
    ]
    const cuisineRail = buildCollections(places, emptyProfile()).find((c) =>
      c.id.startsWith('cuisine-')
    )
    expect(cuisineRail).toBeDefined()
    expect(cuisineRail!.id).toBe('cuisine-italian')
    expect(cuisineRail!.title).toContain('du moment')
  })
})

describe('buildCollections — dedup & hero exclusion', () => {
  it('never repeats a place across collections', () => {
    const places = [
      rated(9, 'Italian', { open_now: true, distance: 100, wikidata: { michelin_stars: 1 } }),
      rated(8, 'Italian', { open_now: true, distance: 200 }),
      rated(7, 'Italian', { open_now: true, distance: 300 }),
      rated(6, 'French', { open_now: true, distance: 350 }),
      rated(5, 'Thai', { distance: 500 }),
    ]
    const cs = buildCollections(places, emptyProfile())
    const ids = cs.flatMap((c) => c.places.map((p) => p.osm_id))
    expect(ids.length).toBe(new Set(ids).size)
  })

  it('excludes the hero id from every collection', () => {
    const hero = rated(10, 'Italian', { open_now: true, distance: 50 })
    const places = [
      hero,
      rated(8, 'Italian', { open_now: true, distance: 200 }),
      rated(7, 'Italian', { open_now: true, distance: 300 }),
      rated(6, 'French', { open_now: true, distance: 350 }),
    ]
    const cs = buildCollections(places, emptyProfile(), hero.osm_id)
    const ids = cs.flatMap((c) => c.places.map((p) => p.osm_id))
    expect(ids).not.toContain(hero.osm_id)
  })
})
