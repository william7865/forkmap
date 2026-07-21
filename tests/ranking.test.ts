import { describe, it, expect } from 'vitest'
import { placeRank, rankLabel, RANK_MIN_COMPARABLES, RANK_MAX_SHOWN } from '@/lib/ranking'
import type { PlaceCard } from '@/types'

let seq = 0
function burger(rating: number, opts: { cuisine?: string; reviews?: number } = {}): PlaceCard {
  return {
    osm_id: `b${seq++}`,
    name: `Burger ${seq}`,
    lat: 0,
    lon: 0,
    cuisine: opts.cuisine ?? 'burger',
    fsq: { rating, total_ratings: opts.reviews },
  } as unknown as PlaceCard
}

describe('placeRank', () => {
  it('classe par note parmi la même cuisine', () => {
    const me = burger(8.5)
    const sibs = [burger(9.2), burger(9.0), burger(7.0)]
    const r = placeRank(me, sibs)
    // Notes triées : 9.2, 9.0, 8.5(moi), 7.0 → je suis 3e
    expect(r).toEqual({ rank: 3, total: 4, cuisineLabel: 'Burger' })
  })

  it('ne compte QUE la même cuisine', () => {
    const me = burger(8.0)
    const sibs = [burger(9.0), burger(9.5, { cuisine: 'sushi' }), burger(7.0)]
    const r = placeRank(me, sibs)
    // sushi ignoré → burgers : 9.0, 8.0(moi), 7.0 → 2e sur 3
    expect(r).toEqual({ rank: 2, total: 3, cuisineLabel: 'Burger' })
  })

  it('renvoie null sous le minimum de comparables', () => {
    const me = burger(8.0)
    expect(placeRank(me, [burger(9.0)])).toBeNull() // 2 < 3
    expect(RANK_MIN_COMPARABLES).toBe(3)
  })

  it('renvoie null si le resto est hors du top affiché', () => {
    const me = burger(5.0)
    const better = Array.from({ length: RANK_MAX_SHOWN }, () => burger(9.0))
    // 5 concurrents à 9.0, moi 6e → hors top 5
    expect(placeRank(me, better)).toBeNull()
  })

  it('renvoie null sans note ou sans cuisine', () => {
    const noRating = {
      osm_id: 'x',
      name: 'X',
      lat: 0,
      lon: 0,
      cuisine: 'burger',
    } as unknown as PlaceCard
    expect(placeRank(noRating, [burger(9), burger(8)])).toBeNull()
    const noCuisine = {
      osm_id: 'y',
      name: 'Y',
      lat: 0,
      lon: 0,
      fsq: { rating: 8 },
    } as unknown as PlaceCard
    expect(placeRank(noCuisine, [burger(9), burger(8)])).toBeNull()
  })

  it('ignore les comparables sans note', () => {
    const me = burger(8.0)
    const noRating = {
      osm_id: 'z',
      name: 'Z',
      lat: 0,
      lon: 0,
      cuisine: 'burger',
    } as unknown as PlaceCard
    // seulement 2 burgers NOTÉS (moi + un) → sous le minimum
    expect(placeRank(me, [burger(9.0), noRating])).toBeNull()
  })

  it('ne compte pas deux fois la place elle-même si elle est aussi dans siblings', () => {
    const me = burger(8.0)
    const r = placeRank(me, [me, burger(9.0), burger(7.0)])
    expect(r?.total).toBe(3) // pas 4
    expect(r?.rank).toBe(2)
  })

  it('départage la note égale par le nombre d’avis', () => {
    const me = burger(8.0, { reviews: 500 })
    const tie = burger(8.0, { reviews: 50 })
    const low = burger(7.0)
    // note égale, mais moi 500 avis > 50 → je passe devant
    expect(placeRank(me, [tie, low])?.rank).toBe(1)
  })
})

describe('rankLabel', () => {
  it('formule honnête, relative à la zone', () => {
    expect(rankLabel({ rank: 1, total: 4, cuisineLabel: 'Burger' })).toBe(
      '1ᵉʳ mieux noté · Burger · autour de toi'
    )
    expect(rankLabel({ rank: 3, total: 4, cuisineLabel: 'Japonais' })).toBe(
      '3ᵉ mieux noté · Japonais · autour de toi'
    )
  })
})
