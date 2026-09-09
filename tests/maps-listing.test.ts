import { describe, it, expect } from 'vitest'
// Le module est en .mjs : c'est le fichier que le scraper exécute réellement.
// Le tester directement évite d'entretenir une deuxième implémentation en TS
// qui finirait par diverger de celle qui tourne.
// @ts-expect-error — module JavaScript sans déclarations de types
import {
  parseRating,
  parseRatingLabel,
  parseCategoryLine,
  parseStatus,
  parseListing,
} from '@/scripts/lib/maps-listing.mjs'

// Lignes relevées telles quelles sur le panneau de résultats de Google Maps.
const BAOBEI = [
  'Little Baobei',
  'Little Baobei',
  '4,7(1 366)',
  'Restaurant de cuisine fusion asiatique ·  · 6 Pl. Sainte-Opportune',
  'Restaurant branché de cuisine de rue asiatique',
  'Ferme bientôt · 14:30 · Rouvre à 19:00',
  'Commander',
]
const CASANOVA = [
  'Casanova',
  'Casanova',
  '4,3(776)',
  'Restaurant italien · 6 Rue des Lavandières Sainte-Opportune',
  'Ouvert · Ferme à 00:00',
]

describe('parseRating', () => {
  it('lit la note et le nombre d’avis', () => {
    expect(parseRating(CASANOVA)).toEqual({ rating: 4.3, reviews: 776 })
  })

  // « 1 366 » utilise une espace insécable comme séparateur de milliers :
  // un parseInt naïf renvoie 1.
  it('gère les séparateurs de milliers français', () => {
    expect(parseRating(BAOBEI)).toEqual({ rating: 4.7, reviews: 1366 })
  })

  // La vraie ligne servie par Google utilise U+202F entre les milliers.
  // Le test précédent passait avec une espace ordinaire et masquait le bug.
  it('gère l’espace fine insécable de Google (U+202F)', () => {
    expect(parseRating(['4,8(4\u202f867)'])).toEqual({ rating: 4.8, reviews: 4867 })
  })

  it('accepte une note entière', () => {
    expect(parseRating(['5(12)'])).toEqual({ rating: 5, reviews: 12 })
  })

  // Une session neuve reçoit un panneau réduit : la note sans les avis.
  // Exiger les parenthèses faisait perdre la note aussi.
  it('lit une note seule, sans nombre d’avis', () => {
    expect(parseRating(['Chez Test', '4,7', 'Restaurant · 1 rue X'])).toEqual({
      rating: 4.7,
      reviews: null,
    })
  })

  it('ne renvoie rien sur une fiche sans note', () => {
    expect(parseRating(['Chez Test', 'Restaurant · 1 rue X'])).toEqual({
      rating: null,
      reviews: null,
    })
  })
})

describe('parseRatingLabel', () => {
  // L'étiquette de l'étoile est la source FIABLE. Le texte de la carte dépend
  // du panneau que Google sert : une session neuve en reçoit une version
  // réduite où la note est collée au reste et le nombre d'avis absent.
  // Mesuré : 0 note lue sur 164 restaurants en passant par le texte.
  it('lit une note seule', () => {
    expect(parseRatingLabel('4,6 étoiles')).toEqual({ rating: 4.6, reviews: null })
  })

  it('lit la note et le nombre d’avis', () => {
    expect(parseRatingLabel('4,7 étoiles 1 366 avis')).toEqual({ rating: 4.7, reviews: 1366 })
  })

  it('gère l’espace insécable entre les milliers', () => {
    expect(parseRatingLabel('4,8 étoiles 4\u00a0867 avis')).toEqual({ rating: 4.8, reviews: 4867 })
  })

  it('accepte une note entière', () => {
    expect(parseRatingLabel('5 étoiles 12 avis')).toEqual({ rating: 5, reviews: 12 })
  })

  it('ne renvoie rien sur autre chose', () => {
    expect(parseRatingLabel('Sponsorisé')).toEqual({ rating: null, reviews: null })
    expect(parseRatingLabel(null)).toEqual({ rating: null, reviews: null })
  })
})

describe('parseCategoryLine', () => {
  it('sépare catégorie et adresse', () => {
    expect(parseCategoryLine(CASANOVA)).toEqual({
      category: 'Restaurant italien',
      price: null,
      address: '6 Rue des Lavandières Sainte-Opportune',
    })
  })

  // Le prix manquant laisse un séparateur orphelin : « Restaurant … ·  · 6 Pl… ».
  // Sans filtrage des segments vides, l'adresse serait prise pour un prix.
  it('survit à un champ prix vide', () => {
    expect(parseCategoryLine(BAOBEI)).toEqual({
      category: 'Restaurant de cuisine fusion asiatique',
      price: null,
      address: '6 Pl. Sainte-Opportune',
    })
  })

  it('reconnaît le prix quand il est là', () => {
    const r = parseCategoryLine(['Bistrot · €€ · 12 rue de la Paix'])
    expect(r).toEqual({ category: 'Bistrot', price: '€€', address: '12 rue de la Paix' })
  })

  // Sinon « Ouvert · Ferme à 00:00 » serait lu comme « catégorie · adresse ».
  it('ignore la ligne d’horaires', () => {
    expect(parseCategoryLine(['Ouvert · Ferme à 00:00'])).toEqual({
      category: null,
      price: null,
      address: null,
    })
  })
})

describe('parseStatus', () => {
  it('lit un état ouvert et son heure de fermeture', () => {
    expect(parseStatus(CASANOVA)).toMatchObject({ open: true, closesAt: '00:00', opensAt: null })
  })

  // ⚠️ Le piège : « Ferme bientôt » veut dire OUVERT. C'est exactement l'erreur
  // qui faisait annoncer fermés des restaurants ouverts dans l'app.
  it('ne confond pas « Ferme bientôt » avec « fermé »', () => {
    expect(parseStatus(BAOBEI)).toMatchObject({ open: true, opensAt: '19:00' })
  })

  it('lit un état fermé et son heure de réouverture', () => {
    expect(parseStatus(['Fermé · Ouvre à 12:00'])).toMatchObject({
      open: false,
      opensAt: '12:00',
    })
  })

  it('reste indéfini sans ligne d’état', () => {
    expect(parseStatus(['Chez Test'])).toMatchObject({ open: null })
  })
})

describe('parseListing', () => {
  it('assemble une fiche complète', () => {
    expect(
      parseListing({
        name: 'Little Baobei',
        fid: '0x47e66f9a89ef0223:0xff3ee69b3265d206',
        lat: 48.8595729,
        lon: 2.3474826,
        lines: BAOBEI,
        ratingLabel: '4,7 étoiles 1 366 avis',
      })
    ).toEqual({
      fid: '0x47e66f9a89ef0223:0xff3ee69b3265d206',
      name: 'Little Baobei',
      lat: 48.8595729,
      lon: 2.3474826,
      rating: 4.7,
      reviews: 1366,
      category: 'Restaurant de cuisine fusion asiatique',
      price: null,
      address: '6 Pl. Sainte-Opportune',
      open_now: true,
      closes_at: null,
      opens_at: '19:00',
    })
  })
})

describe('parseListing — priorité des sources', () => {
  // Quand les deux existent, l'étiquette gagne : le texte peut venir d'un
  // panneau réduit où le nombre d'avis manque.
  it('préfère l’étiquette de l’étoile au texte', () => {
    const r = parseListing({
      name: 'X',
      fid: '0x1:0x2',
      lat: 1,
      lon: 2,
      lines: ['4,1'],
      ratingLabel: '4,9 étoiles 300 avis',
    })
    expect(r.rating).toBe(4.9)
    expect(r.reviews).toBe(300)
  })

  it('retombe sur le texte quand l’étiquette manque', () => {
    const r = parseListing({
      name: 'X',
      fid: '0x1:0x2',
      lat: 1,
      lon: 2,
      lines: ['4,3(776)'],
      ratingLabel: null,
    })
    expect(r.rating).toBe(4.3)
    expect(r.reviews).toBe(776)
  })
})
