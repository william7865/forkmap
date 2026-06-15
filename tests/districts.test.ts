import { describe, it, expect } from 'vitest'
import { parisArrondissement, parisLabel, placeDistrict, extractDistricts } from '@/lib/districts'
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

describe('parisArrondissement', () => {
  it('parses standard Paris postcodes', () => {
    expect(parisArrondissement('75001')).toBe(1)
    expect(parisArrondissement('75011')).toBe(11)
    expect(parisArrondissement('75020')).toBe(20)
  })

  it('handles the 16th arrondissement alt postcode 75116', () => {
    expect(parisArrondissement('75116')).toBe(16)
  })

  it('returns null for non-Paris or invalid postcodes', () => {
    expect(parisArrondissement('69001')).toBeNull() // Lyon
    expect(parisArrondissement('75021')).toBeNull() // out of range
    expect(parisArrondissement(undefined)).toBeNull()
    expect(parisArrondissement('abc')).toBeNull()
  })
})

describe('parisLabel', () => {
  it('uses the ordinal "1ᵉʳ" for the first', () => {
    expect(parisLabel(1)).toBe('Paris 1ᵉʳ')
  })
  it('uses "ᵉ" for the rest', () => {
    expect(parisLabel(11)).toBe('Paris 11ᵉ')
  })
})

describe('placeDistrict', () => {
  it('prefers the Paris arrondissement from postcode', () => {
    expect(placeDistrict(makePlace({ osm_enriched: { postcode: '75011', city: 'Paris' } }))).toBe(
      'Paris 11ᵉ'
    )
  })

  it('falls back to district then city outside Paris', () => {
    expect(placeDistrict(makePlace({ osm_enriched: { district: 'Croix-Rousse' } }))).toBe(
      'Croix-Rousse'
    )
    expect(placeDistrict(makePlace({ osm_enriched: { city: 'Lyon' } }))).toBe('Lyon')
  })

  it('returns null when nothing is known', () => {
    expect(placeDistrict(makePlace())).toBeNull()
  })
})

describe('extractDistricts', () => {
  it('dedupes and sorts Paris arrondissements numerically, first', () => {
    const places = [
      makePlace({ osm_id: 'a', osm_enriched: { postcode: '75011' } }),
      makePlace({ osm_id: 'b', osm_enriched: { postcode: '75003' } }),
      makePlace({ osm_id: 'c', osm_enriched: { postcode: '75011' } }), // dup
      makePlace({ osm_id: 'd', osm_enriched: { city: 'Montreuil' } }),
    ]
    expect(extractDistricts(places)).toEqual(['Paris 3ᵉ', 'Paris 11ᵉ', 'Montreuil'])
  })

  it('ignores places with no zone', () => {
    expect(extractDistricts([makePlace()])).toEqual([])
  })
})
