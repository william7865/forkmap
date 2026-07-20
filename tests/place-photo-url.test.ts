import { describe, it, expect } from 'vitest'
import { placePhotoUrl } from '@/components/place/PlaceThumb'
import type { PlaceCard } from '@/types'

const google = {
  osm_id: 'n1',
  name: 'X',
  lat: 0,
  lon: 0,
  fsq: { photos: [{ prefix: 'https://g/', suffix: '/p.jpg', width: 100, height: 100 }] },
} as unknown as PlaceCard

describe('placePhotoUrl', () => {
  it('Google/FSQ en premier, à la taille demandée', () => {
    expect(placePhotoUrl(google, 96)).toBe('https://g/96x96/p.jpg')
    expect(placePhotoUrl(google, 240)).toContain('240x240')
  })

  it('retombe sur Wikimedia puis Wikidata', () => {
    const wiki = {
      osm_id: 'n2',
      name: 'X',
      lat: 0,
      lon: 0,
      osm_enriched: { image_url: 'https://commons/v.jpg' },
    } as unknown as PlaceCard
    expect(placePhotoUrl(wiki, 96)).toBe('https://commons/v.jpg')
    const wd = {
      osm_id: 'n3',
      name: 'X',
      lat: 0,
      lon: 0,
      wikidata: { image_url: 'https://wd/v.jpg' },
    } as unknown as PlaceCard
    expect(placePhotoUrl(wd, 96)).toBe('https://wd/v.jpg')
  })

  it('IGNORE Mapillary : une façade de rue n’est plus une photo valide', () => {
    const mly = {
      osm_id: 'n4',
      name: 'X',
      lat: 0,
      lon: 0,
      osm_enriched: { mapillary_url: 'https://mly/street.jpg' },
    } as unknown as PlaceCard
    expect(placePhotoUrl(mly, 96)).toBeNull()
  })

  it('renvoie null quand aucune vraie source n’a de photo (→ mode classement)', () => {
    const bare = { osm_id: 'n5', name: 'X', lat: 0, lon: 0 } as unknown as PlaceCard
    expect(placePhotoUrl(bare, 96)).toBeNull()
  })
})
