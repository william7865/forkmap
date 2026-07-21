import { describe, it, expect } from 'vitest'
import { enrichOsmClient } from '@/lib/osm-enrichment'
import type { PlaceCard } from '@/types'

function place(tags: Record<string, string>, extra: Partial<PlaceCard> = {}): PlaceCard {
  return {
    osm_id: 'node/1',
    osm_type: 'node',
    name: 'Test',
    lat: 48.8,
    lon: 2.3,
    tags,
    opening_hours: tags['opening_hours'],
    ...extra,
  } as PlaceCard
}

describe('enrichOsmClient', () => {
  it('adds today_hours from opening_hours', () => {
    const out = enrichOsmClient(place({ opening_hours: 'Mo-Su 09:00-17:00' }))
    expect(out.osm_enriched?.today_hours).toBe('09:00 – 17:00')
    expect(out.osm_enriched?.open_now).toBeTypeOf('boolean')
    expect(out.open_now).toBe(out.osm_enriched?.open_now)
  })

  it('extracts Michelin stars into osm_enriched + wikidata distinctions', () => {
    const out = enrichOsmClient(place({ stars: '2' }))
    expect(out.osm_enriched?.michelin).toBe(2)
    expect(out.wikidata?.distinctions).toContain('⭐⭐ Michelin')
  })

  it('extracts Bib Gourmand', () => {
    const out = enrichOsmClient(place({ 'award:bib_gourmand': 'yes' }))
    expect(out.wikidata?.distinctions).toContain('Bib Gourmand')
  })

  it('preserves existing google/fsq data and adds nothing for tag-less places', () => {
    const fsq = {
      fsq_id: 'x',
      photos: [{ id: 'p', prefix: 'a', suffix: 'b', width: 1, height: 1 }],
    }
    const out = enrichOsmClient(place({}, { fsq: fsq as PlaceCard['fsq'], fsq_rating: 9 }))
    expect(out.fsq).toEqual(fsq)
    expect(out.fsq_rating).toBe(9)
    expect(out.wikidata).toBeUndefined()
  })

  it('merges distinctions on top of an existing wikidata object', () => {
    const out = enrichOsmClient(
      place({ stars: '1' }, { wikidata: { description: 'Bistrot', distinctions: ['Guide'] } })
    )
    expect(out.wikidata?.description).toBe('Bistrot')
    expect(out.wikidata?.distinctions).toEqual(['Guide', '⭐ Michelin'])
  })
})
