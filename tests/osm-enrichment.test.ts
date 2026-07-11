// ============================================================
// tests/osm-enrichment.test.ts
//
// menu_url is the fiche's one reliable, free link to "what does this place
// serve". These pin the extraction: the accepted tags, their priority, and the
// cases that must NOT produce a link.
// ============================================================

import { describe, it, expect } from 'vitest'
import { extractOsmEnrichment } from '@/lib/osm-enrichment'
import type { OsmTags } from '@/types'

const base: OsmTags = { amenity: 'restaurant', name: 'Chez Test' }

describe('extractOsmEnrichment — menu_url', () => {
  it('reads the `menu` tag', () => {
    const e = extractOsmEnrichment({ ...base, menu: 'https://resto.fr/carte.pdf' })
    expect(e.menu_url).toBe('https://resto.fr/carte.pdf')
  })

  it('falls back to `website:menu` then `contact:menu`', () => {
    expect(extractOsmEnrichment({ ...base, 'website:menu': 'https://a.fr/m' }).menu_url).toBe(
      'https://a.fr/m'
    )
    expect(extractOsmEnrichment({ ...base, 'contact:menu': 'https://b.fr/m' }).menu_url).toBe(
      'https://b.fr/m'
    )
  })

  it('prefers `menu` over the fallbacks', () => {
    const e = extractOsmEnrichment({
      ...base,
      menu: 'https://primary.fr/m',
      'website:menu': 'https://secondary.fr/m',
    })
    expect(e.menu_url).toBe('https://primary.fr/m')
  })

  it('is undefined when no menu tag is present', () => {
    expect(extractOsmEnrichment(base).menu_url).toBeUndefined()
  })

  it('treats `menu=no` as no menu, not a link', () => {
    expect(extractOsmEnrichment({ ...base, menu: 'no' }).menu_url).toBeUndefined()
  })

  it('rejects a non-http value (a bare "yes" or junk is not a URL)', () => {
    expect(extractOsmEnrichment({ ...base, menu: 'yes' }).menu_url).toBeUndefined()
    expect(extractOsmEnrichment({ ...base, menu: 'ask staff' }).menu_url).toBeUndefined()
  })
})
