import { describe, it, expect } from 'vitest'
import {
  isGooglePhotoUrl,
  googlePhotoAtSize,
  dedupeGooglePhotos,
  looksLikeThumbnailOnly,
  googleFeatureId,
  mapsPlaceUrl,
  mapsSearchUrl,
  titleMatchesPlace,
  parseCachedPhotos,
  sanitisePhotoUrls,
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

describe('googleFeatureId', () => {
  it('reconnaît un identifiant de fiche Google', () => {
    expect(googleFeatureId('0x47e671e4bea0305b:0x5dc2e16febad2dff')).toBe(
      '0x47e671e4bea0305b:0x5dc2e16febad2dff'
    )
  })

  // Les lieux venus d'une recherche Google sans identifiant natif portent un
  // id de synthèse « g/lat,lon » : il n'ouvre aucune fiche.
  it('écarte tout le reste', () => {
    expect(googleFeatureId('g/48.85576,2.35614')).toBeNull()
    expect(googleFeatureId('fsq3abc')).toBeNull()
    expect(googleFeatureId(null)).toBeNull()
    expect(googleFeatureId(undefined)).toBeNull()
  })
})

describe('mapsPlaceUrl', () => {
  it('ouvre directement la fiche par son identifiant', () => {
    const u = mapsPlaceUrl('0x1:0x2', 48.85, 2.35)
    expect(u).toContain('/maps/place/data=')
    expect(u).toContain('!1s0x1:0x2')
    expect(u).toContain('!3d48.85!4d2.35')
  })
})

describe('mapsSearchUrl', () => {
  // ⚠️ Le bug qui a fait afficher les photos d'un autre établissement : les
  // coordonnées étaient dans le TEXTE cherché, où Google les traite comme des
  // mots. Elles doivent être dans le chemin, après « @ ».
  it('met la position dans le chemin, pas dans la requête', () => {
    const u = mapsSearchUrl('La Perla', 48.85576, 2.35614)
    expect(u).toContain('/maps/search/La%20Perla/@48.85576,2.35614,17z')
    expect(u).not.toContain('La%20Perla%2048')
  })
})

describe('titleMatchesPlace', () => {
  it('accepte le même nom', () => {
    expect(titleMatchesPlace('Le Vent d’Armor', "Le Vent d'Armor")).toBe(true)
  })

  // Google rallonge souvent le nom sur sa fiche.
  it('accepte un nom rallongé par Google', () => {
    expect(titleMatchesPlace('Gangnam Restaurant Coréen', 'Gangnam')).toBe(true)
  })

  it('ignore accents, casse et ponctuation', () => {
    expect(titleMatchesPlace('CAFÉ MÉLODIE', 'cafe melodie')).toBe(true)
  })

  // Le cas qui compte : mieux vaut rien afficher que les photos d'à côté.
  it('refuse un autre établissement', () => {
    expect(titleMatchesPlace('Sushi Palace', 'Gangnam')).toBe(false)
    expect(titleMatchesPlace('Résultats', 'Gangnam')).toBe(false)
  })

  it('refuse une entrée vide', () => {
    expect(titleMatchesPlace(null, 'Gangnam')).toBe(false)
    expect(titleMatchesPlace('Gangnam', '')).toBe(false)
  })
})

describe('parseCachedPhotos', () => {
  const now = new Date('2026-09-09T12:00:00Z')
  const frais = { urls: [A, B], at: '2026-09-01T12:00:00Z' }

  it('rend les URL d’une entrée fraîche', () => {
    expect(parseCachedPhotos(frais, now)).toEqual([A, B])
  })

  // Une URL Google peut mourir : une entrée trop vieille est jetée plutôt que
  // de servir des images cassées.
  it('périme au-delà d’un mois', () => {
    expect(parseCachedPhotos({ urls: [A], at: '2026-07-01T12:00:00Z' }, now)).toBeNull()
  })

  it('écarte ce qui n’est pas une photo Google', () => {
    expect(parseCachedPhotos({ urls: ['https://evil.test/x.jpg'], at: frais.at }, now)).toBeNull()
  })

  it('refuse une entrée mal formée', () => {
    expect(parseCachedPhotos(null, now)).toBeNull()
    expect(parseCachedPhotos({ urls: [] as string[], at: frais.at }, now)).toBeNull()
    expect(parseCachedPhotos({ urls: [A] }, now)).toBeNull()
    expect(parseCachedPhotos({ urls: [A], at: 'pas une date' }, now)).toBeNull()
  })

  // Une date dans le futur signale une horloge faussée : on ne s'y fie pas.
  it('refuse une date future', () => {
    expect(parseCachedPhotos({ urls: [A], at: '2027-01-01T00:00:00Z' }, now)).toBeNull()
  })
})

describe('sanitisePhotoUrls', () => {
  it('ne garde que des photos Google, dédoublonnées', () => {
    expect(sanitisePhotoUrls([A, A_THUMB, B, 'https://evil.test/x.jpg'])).toEqual([A, B])
  })

  it('borne le nombre', () => {
    // Des URL VRAIMENT distinctes : l'identité d'une photo est la partie avant
    // le « = », donc suffixer après ne crée pas une nouvelle photo.
    const many = Array.from(
      { length: 30 },
      (_, i) => `https://lh3.googleusercontent.com/photo${i}=w408-h544-k-no`
    )
    expect(sanitisePhotoUrls(many, 4)).toHaveLength(4)
  })

  it('supporte n’importe quelle entrée', () => {
    expect(sanitisePhotoUrls(null)).toEqual([])
    expect(sanitisePhotoUrls('texte')).toEqual([])
  })
})
