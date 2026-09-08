import { describe, it, expect } from 'vitest'
import type { PlaceCard } from '@/types'
import { buildPlaceFacts, MAX_FACTS } from '@/lib/place-facts'

function place(over: Partial<PlaceCard> = {}): PlaceCard {
  return {
    osm_id: 'node/1',
    osm_type: 'node',
    name: 'Chez Test',
    lat: 48.85,
    lon: 2.35,
    tags: {},
    ...over,
  }
}

describe('buildPlaceFacts', () => {
  it('ne renvoie rien pour un lieu absent', () => {
    expect(buildPlaceFacts(null)).toEqual([])
    expect(buildPlaceFacts(undefined)).toEqual([])
  })

  // Le cas qui a motivé la fonction : un lieu dont on ne sait presque rien.
  // Mieux vaut une seule case juste que trois dont deux affichent « — ».
  it('ne comble pas les trous', () => {
    expect(buildPlaceFacts(place())).toEqual([])
    expect(buildPlaceFacts(place({ fsq: { fsq_id: 'g:1', rating: 9.6 } }))).toEqual([
      { value: '9.6', label: 'NOTE' },
    ])
  })

  it('joint l’heure de fermeture à l’état ouvert', () => {
    const f = buildPlaceFacts(
      place({
        open_now: true,
        fsq: { fsq_id: 'g:1', hours: { today: '12:00–14:30, 19:00–22:00' } },
      })
    )
    expect(f).toContainEqual({ value: 'Ouvert', label: "JUSQU'À 22:00" })
  })

  // Annoncer « fermé · jusqu'à 22:00 » serait absurde : cette heure est passée.
  it('n’annonce pas d’heure de fermeture sur un lieu fermé', () => {
    const f = buildPlaceFacts(
      place({ open_now: false, fsq: { fsq_id: 'g:1', hours: { today: '12:00–22:00' } } })
    )
    expect(f).toContainEqual({ value: 'Fermé', label: 'MAINTENANT' })
  })

  // L'horaire passe devant les avis : Google ne renvoie pas le nombre d'avis
  // sur le point d'entrée qu'on interroge, l'état d'ouverture si.
  it('ordonne note, horaire, puis le reste', () => {
    const f = buildPlaceFacts(
      place({
        open_now: true,
        cuisine: 'japanese',
        distance: 400,
        fsq: { fsq_id: 'g:1', rating: 9.1, total_ratings: 240, price: 2 },
      })
    )
    expect(f.map((x) => x.label)).toEqual(['NOTE', 'MAINTENANT', 'AVIS'])
  })

  // La cuisine appartient à la ligne sous le titre. L'avoir aussi dans la
  // rangée affichait deux fois la même chose sur le même écran.
  it('laisse la cuisine à la ligne méta', () => {
    const f = buildPlaceFacts(place({ cuisine: 'japanese' }))
    expect(f).toEqual([])
  })

  it('ne dépasse jamais trois cases', () => {
    const f = buildPlaceFacts(
      place({
        open_now: true,
        cuisine: 'japanese',
        distance: 400,
        fsq: { fsq_id: 'g:1', rating: 9.1, total_ratings: 240, price: 2 },
      })
    )
    expect(f.length).toBe(MAX_FACTS)
  })

  it('retombe sur fsq_rating quand fsq.rating manque', () => {
    expect(buildPlaceFacts(place({ fsq_rating: 8.4 }))).toEqual([{ value: '8.4', label: 'NOTE' }])
  })
})
