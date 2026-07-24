import { describe, it, expect } from 'vitest'
import { extractLocationTag } from '@/lib/import/location'

describe('extractLocationTag', () => {
  it('returns null for empty / location-less HTML', () => {
    expect(extractLocationTag('', 'tiktok')).toBeNull()
    expect(extractLocationTag('<html><body>no location here</body></html>', 'instagram')).toBeNull()
  })

  it('reads a JSON-LD Restaurant with geo + city (any platform)', () => {
    const html = `<html><head>
      <script type="application/ld+json">
      {"@type":"Restaurant","name":"Septime","geo":{"latitude":48.8531,"longitude":2.3818},
       "address":{"addressLocality":"Paris"}}
      </script></head></html>`
    expect(extractLocationTag(html, 'other')).toEqual({
      name: 'Septime',
      city: 'Paris',
      lat: 48.8531,
      lon: 2.3818,
    })
  })

  it('reads a JSON-LD @graph and drops out-of-range coords', () => {
    const html = `<script type="application/ld+json">
      {"@graph":[{"@type":"WebPage"},{"@type":["FoodEstablishment"],"name":"Chez Aline","geo":{"latitude":999,"longitude":2.3}}]}
      </script>`
    expect(extractLocationTag(html, 'other')).toEqual({
      name: 'Chez Aline',
      city: null,
      lat: null,
      lon: null,
    })
  })

  it('reads a TikTok POI (name only, no coords)', () => {
    const html = `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
      {"__DEFAULT_SCOPE__":{"webapp.video-detail":{"itemInfo":{"itemStruct":{"poi":{"poiName":"Kodawari Ramen","address":"12 rue de Pontoise"}}}}}}
      </script>`
    expect(extractLocationTag(html, 'tiktok')).toEqual({
      name: 'Kodawari Ramen',
      city: null,
      lat: null,
      lon: null,
    })
  })

  it('reads an Instagram location sticker with coords', () => {
    const html = `<script>window._data = {"location":{"name":"Bouillon Pigalle","lat":48.882,"lng":2.337}}</script>`
    expect(extractLocationTag(html, 'instagram')).toEqual({
      name: 'Bouillon Pigalle',
      city: null,
      lat: 48.882,
      lon: 2.337,
    })
  })

  it('does not read a non-place JSON-LD type', () => {
    const html = `<script type="application/ld+json">{"@type":"VideoObject","name":"Ma vidéo"}</script>`
    expect(extractLocationTag(html, 'other')).toBeNull()
  })
})
