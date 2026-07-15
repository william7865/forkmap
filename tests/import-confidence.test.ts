import { describe, it, expect } from 'vitest'
import { scoreResolution, nameSimilarity, chainMatches } from '@/lib/import/confidence'
import type { PlaceSearchResult } from '@/lib/hooks/usePlaceSearch'
import type { PlaceGuess } from '@/lib/import/candidates'

function result(name: string, rating?: number): PlaceSearchResult {
  return { id: name, name, context: 'Paris', lat: 48.85, lon: 2.35, rating, source: 'google' }
}
const guess = (name: string): PlaceGuess => ({ name, city: 'Paris', confidence: 0.95 })

describe('nameSimilarity', () => {
  it('vaut 1 pour une correspondance exacte, insensible à la casse et aux accents', () => {
    expect(nameSimilarity('Le Train Bleu', 'le train bleu')).toBe(1)
    expect(nameSimilarity('Café de Flore', 'Cafe de Flore')).toBe(1)
  })

  it('reste haut quand le résultat ajoute une précision', () => {
    expect(nameSimilarity('Le Train Bleu', 'Le Train Bleu - Restaurant')).toBeGreaterThan(0.7)
  })

  it('est bas pour deux noms sans rapport', () => {
    expect(nameSimilarity('Le Train Bleu', 'Pizza Roma')).toBeLessThan(0.3)
  })
})

describe('scoreResolution', () => {
  it('résout quand le 1er correspond fortement et se détache du 2e', () => {
    const r = scoreResolution(guess('Le Train Bleu'), [
      result('Le Train Bleu', 4.3),
      result('Pizza Roma', 3.8),
    ])
    expect(r.status).toBe('resolved')
    if (r.status === 'resolved') expect(r.place.name).toBe('Le Train Bleu')
  })

  it('devient ambigu quand deux résultats se ressemblent trop', () => {
    const r = scoreResolution(guess('Le Train Bleu'), [
      result('Le Train Bleu', 4.3),
      result('Le Train Bleu Café', 3.9),
    ])
    expect(r.status).toBe('ambiguous')
    if (r.status === 'ambiguous') expect(r.candidates.length).toBeGreaterThanOrEqual(2)
  })

  it('devient ambigu (jamais resolved) quand la correspondance est faible', () => {
    const r = scoreResolution(guess('Le Train Bleu'), [result('Brasserie du Nord', 4.1)])
    expect(r.status).toBe('ambiguous')
  })

  it('échoue quand il n’y a aucun résultat', () => {
    expect(scoreResolution(guess('Le Train Bleu'), []).status).toBe('failed')
  })

  it('plafonne les candidats ambigus à 3', () => {
    const r = scoreResolution(guess('Bleu'), [
      result('Bleu Bistro'),
      result('Bleu Café'),
      result('Bleu Lagon'),
      result('Bleu Nuit'),
    ])
    if (r.status === 'ambiguous') expect(r.candidates.length).toBe(3)
  })
})

describe('chainMatches', () => {
  it('détecte une chaîne : plusieurs résultats au MÊME nom', () => {
    const branches = chainMatches(guess('SUSHIWAN'), [
      result('SUSHIWAN'),
      result('SUSHIWAN'),
      result('SUSHIWAN'),
    ])
    expect(branches.length).toBe(3)
  })

  it('ignore les résultats d’un autre nom dans la chaîne', () => {
    const branches = chainMatches(guess('SUSHIWAN'), [
      result('SUSHIWAN'),
      result('SUSHIWAN'),
      result('Pizza Roma'),
    ])
    expect(branches.length).toBe(2)
    expect(branches.every((b) => b.name === 'SUSHIWAN')).toBe(true)
  })

  it('n’est PAS une chaîne quand les noms diffèrent (Le Train Bleu vs … Café)', () => {
    const branches = chainMatches(guess('Le Train Bleu'), [
      result('Le Train Bleu'),
      result('Le Train Bleu Café'),
    ])
    expect(branches).toEqual([])
  })

  it('n’est pas une chaîne avec un seul résultat', () => {
    expect(chainMatches(guess('SUSHIWAN'), [result('SUSHIWAN')])).toEqual([])
  })

  it('n’est pas une chaîne quand la correspondance au nom deviné est faible', () => {
    expect(
      chainMatches(guess('SUSHIWAN'), [result('Brasserie du Nord'), result('Brasserie du Nord')])
    ).toEqual([])
  })
})
