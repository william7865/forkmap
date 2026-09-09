import { describe, it, expect, afterEach } from 'vitest'
import { tileUrl } from '@/lib/leaflet-cdn'

const KEY = 'NEXT_PUBLIC_CARTO_KEY'
const original = process.env[KEY]

afterEach(() => {
  if (original === undefined) delete process.env[KEY]
  else process.env[KEY] = original
})

describe('tileUrl', () => {
  it('choisit le fond selon le thème', () => {
    delete process.env[KEY]
    expect(tileUrl(false)).toContain('/light_all/')
    expect(tileUrl(true)).toContain('/dark_all/')
  })

  it('garde les gabarits que Leaflet remplace', () => {
    delete process.env[KEY]
    expect(tileUrl(false)).toContain('{s}')
    expect(tileUrl(false)).toContain('{z}/{x}/{y}{r}.png')
  })

  // Le paramètre est `key`. `api_key` est accepté par Carto SANS erreur et
  // renvoie quand même la tuile barrée « API KEY REQUIRED » : se tromper de
  // nom échoue en silence, et seule une inspection visuelle le révèle.
  it('ajoute la clé sous le paramètre `key`', () => {
    process.env[KEY] = 'cb1_test_123'
    const url = tileUrl(false)
    expect(url).toContain('?key=cb1_test_123')
    expect(url).not.toContain('api_key')
  })

  it('reste utilisable sans clé', () => {
    delete process.env[KEY]
    expect(tileUrl(false)).not.toContain('key=')
  })

  it('échappe la clé', () => {
    process.env[KEY] = 'a b&c'
    expect(tileUrl(false)).toContain('?key=a%20b%26c')
  })
})
