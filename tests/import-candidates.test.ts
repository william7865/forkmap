import { describe, it, expect } from 'vitest'
import { extractPlaceCandidates } from '@/lib/import/candidates'
import type { ImportCandidate } from '@/lib/import/parse'

function post(partial: Partial<ImportCandidate>): ImportCandidate {
  return {
    platform: 'tiktok',
    handle: null,
    title: '',
    description: '',
    hashtags: [],
    query: '',
    ...partial,
  }
}

describe('extractPlaceCandidates', () => {
  it('lit le marqueur 📍 en priorité absolue', () => {
    const out = extractPlaceCandidates(
      post({
        description: 'Un incroyable restaurant caché dans une gare 😍 📍 Le Train Bleu, Paris 12e',
      })
    )
    expect(out[0].name).toBe('Le Train Bleu')
    expect(out[0].city).toBe('Paris 12e')
    expect(out[0].confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('accepte les autres marqueurs de lieu (📌, 🏠, "chez")', () => {
    const out = extractPlaceCandidates(post({ description: '📌 Kodawari Ramen, Paris' }))
    expect(out[0].name).toBe('Kodawari Ramen')
  })

  // Le cas qu'Albo rate : le nom est dans une phrase, sans marqueur.
  it('trouve un nom propre capitalisé dans une phrase narrative', () => {
    const out = extractPlaceCandidates(
      post({ description: "J'ai testé Le Train Bleu et c'était incroyable" })
    )
    expect(out.map((c) => c.name)).toContain('Le Train Bleu')
  })

  it('propose le handle du compte, humanisé, quand il ressemble à un resto', () => {
    const out = extractPlaceCandidates(
      post({ handle: 'kodawari.ramen', description: 'le meilleur ramen' })
    )
    expect(out.map((c) => c.name)).toContain('kodawari ramen')
  })

  it('écarte les hashtags génériques', () => {
    const out = extractPlaceCandidates(
      post({
        description: 'trop bon #paris #restaurant #food #foodporn',
        hashtags: ['paris', 'restaurant', 'food', 'foodporn'],
      })
    )
    expect(out.map((c) => c.name)).not.toContain('paris')
    expect(out.map((c) => c.name)).not.toContain('food')
  })

  it('renvoie une liste vide quand il n’y a rien à deviner', () => {
    expect(extractPlaceCandidates(post({ description: 'trop bon 😍😍' }))).toEqual([])
  })

  it('ne renvoie jamais de doublon et trie par confiance décroissante', () => {
    const out = extractPlaceCandidates(
      post({
        handle: 'le.train.bleu',
        description: '📍 Le Train Bleu, Paris — Le Train Bleu est magnifique',
      })
    )
    const names = out.map((c) => c.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].confidence).toBeGreaterThanOrEqual(out[i].confidence)
    }
  })
})
