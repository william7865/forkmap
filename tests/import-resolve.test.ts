import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ImportRow } from '@/types'
import type { PlaceSearchResult } from '@/lib/hooks/usePlaceSearch'

// The two network dependencies of the resolver: reading the post (native HTTP)
// and asking the oracle (Google scrape + Nominatim). Both mocked — everything
// else (parse → candidates → confidence) runs for real.
vi.mock('@/lib/import/metadata', () => ({ fetchPostMetadata: vi.fn() }))
vi.mock('@/lib/hooks/usePlaceSearch', () => ({ searchPlacesOnce: vi.fn() }))

import { resolveImport } from '@/lib/import/resolve'
import { fetchPostMetadata } from '@/lib/import/metadata'
import { searchPlacesOnce } from '@/lib/hooks/usePlaceSearch'

const meta = vi.mocked(fetchPostMetadata)
const search = vi.mocked(searchPlacesOnce)

const PARIS: [number, number] = [48.8566, 2.3522]

function row(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    id: 'imp-1',
    user_id: 'u1',
    url: 'https://www.tiktok.com/@lefooding/video/123',
    platform: 'tiktok',
    status: 'pending',
    note: null,
    post_title: null,
    post_caption: null,
    post_author: null,
    post_thumb: null,
    osm_id: null,
    place_snapshot: null,
    candidates: null,
    created_at: '2026-07-13T10:00:00.000Z',
    resolved_at: null,
    ...overrides,
  }
}

function osmResult(name: string, over: Partial<PlaceSearchResult> = {}): PlaceSearchResult {
  return {
    id: `node/${name.length}`,
    osm_id: `node/${name.length}`,
    name,
    context: 'Paris, France',
    lat: 48.8443,
    lon: 2.3735,
    source: 'osm',
    ...over,
  }
}

function googleResult(name: string, over: Partial<PlaceSearchResult> = {}): PlaceSearchResult {
  return {
    id: 'g:48.84430,2.37350',
    name,
    context: 'Google Maps',
    lat: 48.8443,
    lon: 2.3735,
    rating: 8.6,
    fsq: { fsq_id: 'g:1', rating: 8.6 },
    source: 'google',
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveImport — chemin résolu', () => {
  it('renvoie un patch resolved contenant À LA FOIS place_snapshot et osm_id', async () => {
    meta.mockResolvedValue({
      title: 'Le Train Bleu',
      description: '📍 Le Train Bleu, Paris — la plus belle salle de Paris',
      image: 'https://p16.tiktokcdn.com/thumb.jpg',
    })
    search.mockResolvedValue([osmResult('Le Train Bleu'), osmResult('Pizza Roma')])

    const patch = await resolveImport(row(), PARIS)

    expect(patch.status).toBe('resolved')
    expect(patch.place_snapshot).toBeTruthy()
    expect(patch.osm_id).toBeTruthy()
    expect(patch.osm_id).toBe(patch.place_snapshot?.osm_id)
    expect(patch.place_snapshot?.name).toBe('Le Train Bleu')
    expect(patch.candidates).toBeNull()
    expect(patch.resolved_at).toBeTruthy()
    // Post metadata is carried by the same patch.
    expect(patch.post_author).toBe('@lefooding')
    expect(patch.post_thumb).toBe('https://p16.tiktokcdn.com/thumb.jpg')
  })

  it('donne un osm_id synthétique aux résultats Google (pas d’osm_id natif)', async () => {
    meta.mockResolvedValue({ title: '📍 Septime, Paris', description: '' })
    search.mockResolvedValue([googleResult('Septime')])

    const patch = await resolveImport(row(), PARIS)

    expect(patch.status).toBe('resolved')
    expect(patch.osm_id).toBe('g/48.84430,2.37350')
    expect(patch.place_snapshot?.osm_id).toBe('g/48.84430,2.37350')
    expect(patch.place_snapshot?.fsq?.fsq_id).toBe('g:1')
  })

  it('cherche autour de Paris quand le centre de carte est inconnu', async () => {
    meta.mockResolvedValue({ title: '📍 Septime', description: '' })
    search.mockResolvedValue([osmResult('Septime')])

    await resolveImport(row(), null)

    expect(search).toHaveBeenCalledWith(expect.stringContaining('Septime'), [48.8566, 2.3522])
  })
})

describe('resolveImport — chemin ambigu', () => {
  it('renvoie ambiguous avec une liste de candidats non vide', async () => {
    meta.mockResolvedValue({ title: '📍 Le Train Bleu', description: '' })
    search.mockResolvedValue([osmResult('Le Train Bleu'), osmResult('Le Train Bleu Café')])

    const patch = await resolveImport(row(), PARIS)

    expect(patch.status).toBe('ambiguous')
    expect(patch.candidates?.length).toBeGreaterThanOrEqual(2)
    expect(patch.place_snapshot).toBeNull()
    expect(patch.osm_id).toBeNull()
    expect(patch.resolved_at).toBeTruthy()
  })

  it('deux résultats de noms DIFFÉRENTS restent ambigus (jamais resolved)', async () => {
    meta.mockResolvedValue({ title: '📍 Le Train Bleu', description: '' })
    search.mockResolvedValue([osmResult('Le Train Bleu'), osmResult('Le Train Bleu Café')])

    const patch = await resolveImport(row(), PARIS)

    expect(patch.status).toBe('ambiguous')
    expect(patch.place_snapshot).toBeNull()
  })
})

describe('resolveImport — chaîne (succursale la plus proche)', () => {
  it('plusieurs résultats au MÊME nom → resolved sur la plus proche du centre', async () => {
    meta.mockResolvedValue({ title: '📍 SUSHIWAN', description: '' })
    // Three branches of the same chain. Only the position separates them.
    search.mockResolvedValue([
      osmResult('SUSHIWAN', { id: 'node/far', osm_id: 'node/far', lat: 45.75, lon: 4.85 }), // Lyon
      osmResult('SUSHIWAN', { id: 'node/near', osm_id: 'node/near', lat: 48.86, lon: 2.35 }), // Paris
      osmResult('SUSHIWAN', { id: 'node/mid', osm_id: 'node/mid', lat: 50.63, lon: 3.06 }), // Lille
    ])

    const patch = await resolveImport(row(), PARIS)

    expect(patch.status).toBe('resolved')
    expect(patch.osm_id).toBe('node/near')
    expect(patch.place_snapshot?.osm_id).toBe('node/near')
    expect(patch.candidates).toBeNull()
  })

  it('chaîne dont la plus proche est incartographiable → retombe sur ambiguous', async () => {
    meta.mockResolvedValue({ title: '📍 SUSHIWAN', description: '' })
    search.mockResolvedValue([
      osmResult('SUSHIWAN', { id: 'node/a', osm_id: 'node/a', lat: 48.86, lon: 2.35 }),
      osmResult('SUSHIWAN', { id: 'node/b', osm_id: 'node/b', lat: 48.87, lon: 2.36 }),
    ])
    // Both usable here → resolves. Sanity: the resolved one is the nearest.
    const patch = await resolveImport(row(), [48.861, 2.351])
    expect(patch.status).toBe('resolved')
    expect(patch.osm_id).toBe('node/a')
  })
})

describe('resolveImport — chemin échec', () => {
  it('échoue (et n’explose pas) quand les métadonnées sont nulles — cas du web', async () => {
    meta.mockResolvedValue(null)

    const patch = await resolveImport(row(), PARIS)

    expect(patch.status).toBe('failed')
    expect(patch.resolved_at).toBeTruthy()
    expect(search).not.toHaveBeenCalled()
  })

  it('échoue quand la légende ne nomme aucun lieu', async () => {
    meta.mockResolvedValue({ title: 'trop bon', description: 'vraiment incroyable 😍' })

    const patch = await resolveImport(
      row({ url: 'https://example.com/v/42', platform: 'other' }),
      PARIS
    )

    expect(patch.status).toBe('failed')
    expect(search).not.toHaveBeenCalled()
    // Metadata read is still persisted, so the UI can show the post.
    expect(patch.post_title).toBe('trop bon')
  })

  it('échoue quand le résolveur ne trouve rien pour aucun candidat', async () => {
    meta.mockResolvedValue({ title: '📍 Le Train Bleu', description: '' })
    search.mockResolvedValue([])

    const patch = await resolveImport(row(), PARIS)

    expect(patch.status).toBe('failed')
    expect(patch.place_snapshot).toBeNull()
    expect(patch.candidates).toBeNull()
  })

  it('échoue proprement quand la recherche réseau lève une exception', async () => {
    meta.mockResolvedValue({ title: '📍 Le Train Bleu', description: '' })
    search.mockRejectedValue(new Error('network down'))

    const patch = await resolveImport(row(), PARIS)

    expect(patch.status).toBe('failed')
  })

  it('échoue proprement quand la lecture du post lève une exception', async () => {
    meta.mockRejectedValue(new Error('bridge missing'))

    const patch = await resolveImport(row(), PARIS)

    expect(patch.status).toBe('failed')
  })
})

describe('resolveImport — garde-fous', () => {
  it('essaie au plus 3 candidats, même quand la légende en propose beaucoup', async () => {
    meta.mockResolvedValue({
      title: '',
      description:
        'Le Train Bleu puis Brasserie Lipp puis Chez Aline puis Le Comptoir Du Relais puis Bouillon Chartier #septime #frenchie',
    })
    search.mockResolvedValue([])

    await resolveImport(row(), PARIS)

    expect(search.mock.calls.length).toBeLessThanOrEqual(3)
    expect(search.mock.calls.length).toBeGreaterThan(0)
  })

  it('passe au candidat suivant quand le premier ne donne rien', async () => {
    meta.mockResolvedValue({ title: '📍 Le Train Bleu', description: 'avec Brasserie Lipp aussi' })
    search.mockResolvedValueOnce([]).mockResolvedValueOnce([osmResult('Brasserie Lipp')])

    const patch = await resolveImport(row(), PARIS)

    expect(search).toHaveBeenCalledTimes(2)
    expect(patch.status).toBe('resolved')
    expect(patch.place_snapshot?.name).toBe('Brasserie Lipp')
  })

  it('n’écrit jamais resolved sans snapshot exploitable (coordonnées cassées)', async () => {
    meta.mockResolvedValue({ title: '📍 Le Train Bleu', description: '' })
    search.mockResolvedValue([
      osmResult('Le Train Bleu', { lat: Number.NaN, lon: Number.NaN }),
      osmResult('Le Train Bleu', { id: 'node/ok', osm_id: 'node/ok', lat: 48.84, lon: 2.37 }),
    ])

    const patch = await resolveImport(row(), PARIS)

    expect(patch.status).toBe('resolved')
    expect(patch.place_snapshot?.osm_id).toBe('node/ok')
    expect(patch.osm_id).toBe('node/ok')
  })

  it('ne devient jamais ambiguous avec une liste de candidats vide', async () => {
    meta.mockResolvedValue({ title: '📍 Le Train Bleu', description: '' })
    // Two look-alikes (→ ambiguous), but both are unusable.
    search.mockResolvedValue([
      osmResult('Le Train Bleu', { lat: Number.NaN }),
      osmResult('Le Train Bleu Café', { lon: 999 }),
    ])

    const patch = await resolveImport(row(), PARIS)

    expect(patch.status).toBe('failed')
    expect(patch.candidates).toBeNull()
  })

  it('n’envoie jamais un post_thumb qui n’est pas une URL (la route le refuserait)', async () => {
    meta.mockResolvedValue({ title: '📍 Septime', description: '', image: 'thumb.jpg' })
    search.mockResolvedValue([osmResult('Septime')])

    const patch = await resolveImport(row(), PARIS)

    expect(patch.status).toBe('resolved')
    expect(patch.post_thumb).toBeNull()
  })

  it('tronque la légende aux limites acceptées par la route', async () => {
    meta.mockResolvedValue({ title: '📍 Septime', description: 'x'.repeat(5000) })
    search.mockResolvedValue([osmResult('Septime')])

    const patch = await resolveImport(row(), PARIS)

    expect(patch.post_caption?.length).toBeLessThanOrEqual(3000)
  })

  it('ne renvoie jamais un statut non terminal (jamais pending)', async () => {
    const cases: Array<() => void> = [
      () => {
        meta.mockResolvedValue(null)
      },
      () => {
        meta.mockResolvedValue({ title: '', description: '' })
      },
      () => {
        meta.mockResolvedValue({ title: '📍 Septime', description: '' })
        search.mockResolvedValue([])
      },
      () => {
        meta.mockResolvedValue({ title: '📍 Septime', description: '' })
        search.mockRejectedValue(new Error('boom'))
      },
      () => {
        meta.mockResolvedValue({ title: '📍 Septime', description: '' })
        search.mockResolvedValue([osmResult('Septime')])
      },
    ]
    for (const setup of cases) {
      vi.clearAllMocks()
      setup()
      const patch = await resolveImport(row(), PARIS)
      expect(patch.status).toBeDefined()
      expect(patch.status).not.toBe('pending')
      expect(['resolved', 'ambiguous', 'failed']).toContain(patch.status)
      if (patch.status === 'resolved') {
        expect(patch.place_snapshot).toBeTruthy()
        expect(patch.osm_id).toBeTruthy()
      }
      if (patch.status === 'ambiguous') {
        expect(patch.candidates?.length).toBeGreaterThan(0)
      }
    }
  })
})
