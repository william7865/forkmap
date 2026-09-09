import { describe, it, expect } from 'vitest'
import {
  thumbExtension,
  thumbObjectPath,
  isStoredThumb,
  isFetchableThumb,
  THUMB_MAX_BYTES,
} from '@/lib/import/thumb'

const SUPA = 'https://abcdef.supabase.co'

describe('thumbExtension', () => {
  it('accepte les formats d’image du web', () => {
    expect(thumbExtension('image/jpeg')).toBe('jpg')
    expect(thumbExtension('image/png')).toBe('png')
    expect(thumbExtension('image/webp')).toBe('webp')
  })

  it('ignore les paramètres et la casse de l’en-tête', () => {
    expect(thumbExtension('IMAGE/JPEG; charset=binary')).toBe('jpg')
  })

  // Le CDN répond parfois `text/html` (page d'erreur) ou `text/plain` avec un
  // code 200 : c'est ce qui arrive quand la signature de l'URL a expiré.
  // Ranger ça dans le bucket stockerait une page d'erreur en guise de photo.
  it('refuse ce qui n’est pas une image', () => {
    expect(thumbExtension('text/html')).toBeNull()
    expect(thumbExtension('text/plain')).toBeNull()
    expect(thumbExtension('application/pdf')).toBeNull()
    expect(thumbExtension(null)).toBeNull()
    expect(thumbExtension(undefined)).toBeNull()
  })
})

describe('thumbObjectPath', () => {
  // Les politiques du bucket autorisent l'écriture sur le PREMIER segment du
  // chemin. Changer l'ordre ici casserait silencieusement toute écriture.
  it('met l’id utilisateur en tête, comme l’exige la politique du bucket', () => {
    expect(thumbObjectPath('u-1', 'imp-9', 'jpg')).toBe('u-1/imp-9.jpg')
  })
})

describe('isStoredThumb', () => {
  it('reconnaît nos propres URL', () => {
    expect(isStoredThumb(`${SUPA}/storage/v1/object/public/import-thumbs/u/i.jpg`, SUPA)).toBe(true)
  })

  // La garde anti-boucle : sans elle, chaque écriture retéléchargerait la
  // vignette déjà rangée pour la ranger à nouveau.
  it('distingue une URL externe', () => {
    expect(isStoredThumb('https://p16.tiktokcdn-eu.com/x.jpg', SUPA)).toBe(false)
  })

  it('ne se laisse pas berner par un hôte qui contient le nôtre', () => {
    expect(isStoredThumb('https://abcdef.supabase.co.evil.test/x.jpg', SUPA)).toBe(false)
  })

  it('reste faux sur une entrée vide ou malformée', () => {
    expect(isStoredThumb(null, SUPA)).toBe(false)
    expect(isStoredThumb('pas une url', SUPA)).toBe(false)
    expect(isStoredThumb(`${SUPA}/x.jpg`, '')).toBe(false)
  })
})

describe('isFetchableThumb', () => {
  it('accepte http et https', () => {
    expect(isFetchableThumb('https://cdn.example.com/a.jpg')).toBe(true)
    expect(isFetchableThumb('http://cdn.example.com/a.jpg')).toBe(true)
  })

  // Le téléchargement se fait côté serveur : une `file:` lirait le disque de
  // la machine, une `data:` contournerait la vérification de type.
  it('refuse les schémas qui ne sortent pas sur le réseau', () => {
    expect(isFetchableThumb('file:///etc/passwd')).toBe(false)
    expect(isFetchableThumb('data:image/png;base64,AAAA')).toBe(false)
    expect(isFetchableThumb(null)).toBe(false)
    expect(isFetchableThumb('')).toBe(false)
  })
})

describe('THUMB_MAX_BYTES', () => {
  it('borne la taille sans être ridicule pour une vignette', () => {
    expect(THUMB_MAX_BYTES).toBeGreaterThan(512 * 1024)
    expect(THUMB_MAX_BYTES).toBeLessThanOrEqual(10 * 1024 * 1024)
  })
})
