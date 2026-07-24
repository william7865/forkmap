import { describe, it, expect } from 'vitest'
import { formatCaption, cleanTitleText } from '@/lib/import/caption'

describe('formatCaption', () => {
  it('returns empty for null/empty input', () => {
    expect(formatCaption(null)).toEqual({ body: '', hashtags: [] })
    expect(formatCaption('')).toEqual({ body: '', hashtags: [] })
    expect(formatCaption('   \n\n  ')).toEqual({ body: '', hashtags: [] })
  })

  it('moves a trailing hashtag wall (own line) to chips', () => {
    const { body, hashtags } = formatCaption(
      'Le meilleur ramen de Paris 🍜\n\n#ramen #paris #foodie #japanese'
    )
    expect(body).toBe('Le meilleur ramen de Paris 🍜')
    expect(hashtags).toEqual(['ramen', 'paris', 'foodie', 'japanese'])
  })

  it('peels a trailing hashtag run off a prose line', () => {
    const { body, hashtags } = formatCaption('Adresse incroyable #paris #resto #food')
    expect(body).toBe('Adresse incroyable')
    expect(hashtags).toEqual(['paris', 'resto', 'food'])
  })

  it('keeps a single inline hashtag inside a sentence', () => {
    const { body, hashtags } = formatCaption('Le meilleur #ramen de la ville')
    expect(body).toBe('Le meilleur #ramen de la ville')
    expect(hashtags).toEqual([])
  })

  it('preserves line breaks but collapses 3+ blank lines', () => {
    const { body } = formatCaption('Ligne 1\n\n\n\nLigne 2')
    expect(body).toBe('Ligne 1\n\nLigne 2')
  })

  it('dedupes hashtags case-insensitively, keeping first casing', () => {
    const { hashtags } = formatCaption('Yum\n#Paris #paris #PARIS #Ramen')
    expect(hashtags).toEqual(['Paris', 'Ramen'])
  })

  it('drops a pure mention/emoji line', () => {
    const { body, hashtags } = formatCaption('Trop bon\n@le_resto 🔥🔥🔥\n#food')
    expect(body).toBe('Trop bon')
    expect(hashtags).toEqual(['food'])
  })

  it('decodes HTML entities', () => {
    expect(formatCaption('L&#x2019;art de la table').body).toBe('L’art de la table')
  })
})

describe('cleanTitleText', () => {
  it('returns empty for null/empty', () => {
    expect(cleanTitleText(null)).toBe('')
    expect(cleanTitleText('🔥🔥')).toBe('')
  })

  it('strips a leading emoji/punctuation run', () => {
    expect(cleanTitleText('🍜🔥 Le meilleur ramen')).toBe('Le meilleur ramen')
  })

  it('removes hashtags', () => {
    expect(cleanTitleText('Ramen de folie #paris #food')).toBe('Ramen de folie')
  })

  it('truncates on a word boundary with an ellipsis', () => {
    const out = cleanTitleText('a'.repeat(10) + ' ' + 'b'.repeat(100), 20)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(21)
  })

  it('keeps a short clean title unchanged', () => {
    expect(cleanTitleText('Kodawari Ramen')).toBe('Kodawari Ramen')
  })
})
