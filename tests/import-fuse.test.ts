import { describe, it, expect } from 'vitest'
import { fuseCandidates, cleanOcrText } from '@/lib/import/candidates'
import type { ImportCandidate } from '@/lib/import/parse'

function post(overrides: Partial<ImportCandidate> = {}): ImportCandidate {
  return {
    platform: 'instagram',
    handle: null,
    account: null,
    title: '',
    description: '',
    hashtags: [],
    query: '',
    ...overrides,
  }
}

const find = (list: { name: string }[], name: string) =>
  list.find((g) => g.name.toLowerCase() === name.toLowerCase())

describe('fuseCandidates', () => {
  it('with only a caption, behaves like the caption extractor', () => {
    const guesses = fuseCandidates({ post: post({ description: '📍 Septime, Paris' }) })
    expect(find(guesses, 'Septime')).toBeTruthy()
  })

  it('adds OCR guesses, capped below a clean caption pin', () => {
    const guesses = fuseCandidates({
      post: post({ description: 'trop bon ce resto 🔥' }),
      ocrText: 'BOUILLON PIGALLE',
    })
    const g = find(guesses, 'Bouillon Pigalle')
    expect(g).toBeTruthy()
    expect(g!.confidence).toBeLessThanOrEqual(0.6)
  })

  it('a geotag with coordinates leads and carries its coords', () => {
    const guesses = fuseCandidates({
      post: post({ description: 'incroyable' }),
      location: { name: 'Le Train Bleu', city: 'Paris', lat: 48.844, lon: 2.373 },
    })
    expect(guesses[0].name).toBe('Le Train Bleu')
    expect(guesses[0].lat).toBe(48.844)
    expect(guesses[0].lon).toBe(2.373)
    expect(guesses[0].confidence).toBeGreaterThanOrEqual(0.95)
  })

  it('boosts a name confirmed by two sources (caption + OCR)', () => {
    const captionOnly = fuseCandidates({ post: post({ description: '📍 Septime' }) })
    const both = fuseCandidates({ post: post({ description: '📍 Septime' }), ocrText: 'SEPTIME' })
    const a = find(captionOnly, 'Septime')!
    const b = find(both, 'Septime')!
    expect(b.confidence).toBeGreaterThan(a.confidence)
  })

  it('a name-only geotag is strong but below a coord geotag', () => {
    const guesses = fuseCandidates({
      post: post({ description: 'miam' }),
      location: { name: 'Chez Aline', city: null, lat: null, lon: null },
    })
    const g = find(guesses, 'Chez Aline')!
    expect(g.confidence).toBeGreaterThanOrEqual(0.8)
    expect(g.confidence).toBeLessThan(0.97)
  })
})

describe('cleanOcrText', () => {
  it('keeps venue-name lines, drops overlay chrome', () => {
    const out = cleanOcrText([
      'BOUILLON PIGALLE',
      '★ 9.0',
      '12€',
      '8 min',
      'OUVERT',
      '@bouillon.pigalle',
      'MENU',
      'Le meilleur bouillon',
    ])
    expect(out).toBe('BOUILLON PIGALLE\nLe meilleur bouillon')
  })

  it('drops ratings, prices and durations', () => {
    expect(cleanOcrText(['4,8/5', '15,90 €', '3 km', '1.2k avis'])).toBe('')
  })

  it('returns empty for empty input', () => {
    expect(cleanOcrText([])).toBe('')
    expect(cleanOcrText(['', '  '])).toBe('')
  })
})
