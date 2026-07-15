import { describe, it, expect } from 'vitest'
import { osmPhotoUrl, extractOsmEnrichment } from '@/lib/osm-enrichment'

describe('osmPhotoUrl', () => {
  it('builds a Commons FilePath URL from a wikimedia_commons File: tag', () => {
    const url = osmPhotoUrl({ wikimedia_commons: 'File:Le Train Bleu Paris.jpg' })
    expect(url).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/Le%20Train%20Bleu%20Paris.jpg?width=800'
    )
  })

  it('respects a requested width', () => {
    expect(osmPhotoUrl({ wikimedia_commons: 'File:X.jpg' }, 240)).toContain('?width=240')
  })

  it('accepts an image tag only when it is on Wikimedia', () => {
    expect(
      osmPhotoUrl({ image: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/X.jpg' })
    ).toBe('https://upload.wikimedia.org/wikipedia/commons/a/ab/X.jpg')
  })

  it('rejects arbitrary image hosts (not in the CSP → would break)', () => {
    expect(osmPhotoUrl({ image: 'https://some-random-host.example/x.jpg' })).toBeNull()
  })

  it('ignores a Category: value (no single image)', () => {
    expect(osmPhotoUrl({ wikimedia_commons: 'Category:Restaurants in Paris' })).toBeNull()
  })

  it('returns null when there is no photo tag', () => {
    expect(osmPhotoUrl({ amenity: 'restaurant', name: 'X' })).toBeNull()
  })

  it('populates osm_enriched.image_url from the tag', () => {
    const e = extractOsmEnrichment({ wikimedia_commons: 'File:Foo.jpg' })
    expect(e.image_url).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/Foo.jpg?width=800'
    )
  })
})
