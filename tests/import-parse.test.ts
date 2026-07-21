import { describe, it, expect } from 'vitest'
import {
  extractOgTags,
  platformFromUrl,
  handleFromUrl,
  cleanTitle,
  accountFromTitle,
  extractHashtags,
  buildImportCandidate,
} from '@/lib/import/parse'

describe('extractOgTags', () => {
  it('reads og tags in either attribute order + decodes entities', () => {
    const html = `
      <meta property="og:title" content="Kodawari Ramen &amp; Co">
      <meta content="Le meilleur ramen de Paris" name="og:description">
      <meta property="og:image" content="https://x/y.jpg">`
    const og = extractOgTags(html)
    expect(og.title).toBe('Kodawari Ramen & Co')
    expect(og.description).toBe('Le meilleur ramen de Paris')
    expect(og.image).toBe('https://x/y.jpg')
  })
})

describe('platformFromUrl', () => {
  it('detects platforms', () => {
    expect(platformFromUrl('https://www.tiktok.com/@x/video/1')).toBe('tiktok')
    expect(platformFromUrl('https://instagram.com/reel/abc')).toBe('instagram')
    expect(platformFromUrl('https://youtu.be/abc')).toBe('youtube')
    expect(platformFromUrl('https://example.com')).toBe('other')
  })
})

describe('handleFromUrl', () => {
  it('extracts the account handle, ignoring path keywords', () => {
    expect(handleFromUrl('https://www.tiktok.com/@kodawari/video/1')).toBe('kodawari')
    expect(handleFromUrl('https://instagram.com/bouillon.pigalle/')).toBe('bouillon.pigalle')
    expect(handleFromUrl('https://instagram.com/reel/abc')).toBeNull()
  })
})

describe('cleanTitle', () => {
  it('strips platform boilerplate and author prefix', () => {
    expect(cleanTitle('Bouillon Pigalle | TikTok', 'tiktok')).toBe('Bouillon Pigalle')
    expect(cleanTitle('lea on Instagram: "Best pasta in town"', 'instagram')).toBe(
      'Best pasta in town'
    )
  })

  it('handles the French « sur » prefix (og:title Instagram FR)', () => {
    expect(
      cleanTitle(
        'SUSHIWAN sur Instagram: IDENTIFIE LA PERSONNE QUI TE DOIT DES SUSHIS',
        'instagram'
      )
    ).toBe('IDENTIFIE LA PERSONNE QUI TE DOIT DES SUSHIS')
  })
})

describe('accountFromTitle', () => {
  it('extrait le nom de compte du préfixe « X sur/on <plateforme>: … »', () => {
    expect(accountFromTitle('SUSHIWAN sur Instagram: IDENTIFIE LA PERSONNE 😂❤️')).toBe('SUSHIWAN')
    expect(accountFromTitle('lea on Instagram: "Best pasta in town"')).toBe('lea')
    expect(accountFromTitle('Bouillon Pigalle | TikTok')).toBeNull()
    expect(accountFromTitle('Just a plain title')).toBeNull()
  })
})

describe('extractHashtags', () => {
  it('collects lowercased tags', () => {
    expect(extractHashtags('Yum #Paris #RAMEN foodie')).toEqual(['paris', 'ramen'])
  })
})

describe('buildImportCandidate', () => {
  it('prefers the handle and enriches with the title', () => {
    const c = buildImportCandidate(
      { title: 'Kodawari Ramen | TikTok', description: 'ramen à Paris #paris' },
      'https://www.tiktok.com/@kodawari.ramen/video/1'
    )
    expect(c.platform).toBe('tiktok')
    expect(c.handle).toBe('kodawari.ramen')
    expect(c.query.toLowerCase()).toContain('kodawari ramen')
    expect(c.hashtags).toContain('paris')
  })

  it('falls back to the title when there is no handle', () => {
    const c = buildImportCandidate(
      { title: 'Bouillon Pigalle', description: '' },
      'https://example.com/x'
    )
    expect(c.query).toBe('Bouillon Pigalle')
  })

  it('expose le nom de compte extrait du préfixe plateforme', () => {
    const c = buildImportCandidate(
      {
        title: 'SUSHIWAN sur Instagram: 📍 13 restaurants en IDF #paris #sushi',
        description: '',
      },
      'https://www.instagram.com/sushiwanfrance/reel/abc'
    )
    expect(c.account).toBe('SUSHIWAN')
    expect(c.handle).toBe('sushiwanfrance')
  })
})

import { decodeEntities } from '@/lib/import/parse'

describe('decodeEntities', () => {
  it('decodes hex numeric references (emoji, curly apostrophe, NBSP)', () => {
    expect(decodeEntities('L&#x2019;art culinaire')).toBe('L’art culinaire')
    expect(decodeEntities('sushis &#x1f602;&#x2764;&#xfe0f;')).toBe('sushis 😂❤️')
    expect(decodeEntities('le&#xa0;21')).toBe('le 21')
  })
  it('decodes decimal numeric references', () => {
    expect(decodeEntities('caf&#233;')).toBe('café')
  })
  it('decodes named entities', () => {
    expect(decodeEntities('Fish &amp; Chips &lt;3')).toBe('Fish & Chips <3')
  })
  it('handles double-encoding (&amp;#x2019;)', () => {
    expect(decodeEntities('L&amp;#x2019;art')).toBe('L’art')
  })
  it('leaves plain text and unknown entities untouched', () => {
    expect(decodeEntities('Chez Marcel')).toBe('Chez Marcel')
    expect(decodeEntities('a &bogus; b')).toBe('a &bogus; b')
  })
})
