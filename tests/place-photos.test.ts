import { describe, it, expect } from 'vitest'
import {
  isGooglePhotoUrl,
  googlePhotoAtSize,
  dedupeGooglePhotos,
  looksLikeThumbnailOnly,
} from '@/lib/place-photos'

// URL réelles relevées sur la fiche Google du Vent d'Armor.
const A = 'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWnjSEV=w408-h544-k-no'
const A_THUMB = 'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWnjSEV=w64-h64-p-k-no'
const B = 'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlAOVL=w140-h121-k-no'

describe('isGooglePhotoUrl', () => {
  it('accepte les hôtes d’images de fiche', () => {
    expect(isGooglePhotoUrl(A)).toBe(true)
    expect(isGooglePhotoUrl('https://lh5.googleusercontent.com/x=w100-h100')).toBe(true)
  })

  // La page contient aussi des avatars d'auteurs d'avis et des pictogrammes.
  it('refuse tout le reste', () => {
    expect(isGooglePhotoUrl('https://streetviewpixels-pa.googleapis.com/x')).toBe(false)
    expect(isGooglePhotoUrl('https://maps.gstatic.com/pin.png')).toBe(false)
    expect(isGooglePhotoUrl(null)).toBe(false)
    expect(isGooglePhotoUrl(undefined)).toBe(false)
  })

  // Un hôte qui CONTIENT le nôtre n'est pas le nôtre.
  it('n’accepte pas un hôte sosie', () => {
    expect(isGooglePhotoUrl('https://lh3.googleusercontent.com.evil.test/x')).toBe(false)
  })
})

describe('googlePhotoAtSize', () => {
  // Sans réécriture, on récupère la taille de la miniature affichée dans le
  // panneau — parfois 64 px de côté, inutilisable en héros de fiche.
  it('remplace le suffixe de taille', () => {
    expect(googlePhotoAtSize(A, 1200, 900)).toBe(
      'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWnjSEV=w1200-h900-k-no'
    )
  })

  it('fonctionne aussi sur une URL sans suffixe', () => {
    expect(googlePhotoAtSize('https://lh3.googleusercontent.com/abc', 800, 600)).toBe(
      'https://lh3.googleusercontent.com/abc=w800-h600-k-no'
    )
  })

  it('arrondit les dimensions', () => {
    expect(googlePhotoAtSize(A, 799.6, 600.2)).toContain('=w800-h600-')
  })
})

describe('dedupeGooglePhotos', () => {
  // La même photo apparaît en plusieurs tailles dans la page : miniature du
  // carrousel ET version ouverte. Sans dédoublonnage, la galerie affiche deux
  // fois la même image.
  it('reconnaît la même photo sous deux tailles', () => {
    expect(dedupeGooglePhotos([A, A_THUMB, B])).toEqual([A, B])
  })

  it('garde l’ordre d’apparition', () => {
    expect(dedupeGooglePhotos([B, A])).toEqual([B, A])
  })

  it('écarte ce qui n’est pas une photo de fiche', () => {
    expect(dedupeGooglePhotos(['https://maps.gstatic.com/pin.png', A])).toEqual([A])
  })

  it('supporte une entrée vide', () => {
    expect(dedupeGooglePhotos([])).toEqual([])
  })
})

describe('looksLikeThumbnailOnly', () => {
  it('repère les pictogrammes et avatars', () => {
    expect(looksLikeThumbnailOnly(A_THUMB)).toBe(true)
    expect(looksLikeThumbnailOnly('https://lh3.googleusercontent.com/x=s44-p-k')).toBe(true)
  })

  it('laisse passer une vraie photo', () => {
    expect(looksLikeThumbnailOnly(A)).toBe(false)
    expect(looksLikeThumbnailOnly(B)).toBe(false)
  })

  it('ne tranche pas sans suffixe', () => {
    expect(looksLikeThumbnailOnly('https://lh3.googleusercontent.com/abc')).toBe(false)
  })
})
