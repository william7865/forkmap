import { describe, it, expect } from 'vitest'
import { extractVenueList } from '@/lib/import/candidates'
import { stripEmbedChrome } from '@/lib/import/parse'

// Légende réelle d'un reel Instagram importé le 2026-09-10, telle que lue dans
// la page d'embed rendue — texte d'interface d'Instagram compris.
const LISTE_PIN = `5 bonnes adresses pour manger à moins de 15€ à Paris

Violetta & Alfredo📍 30 Rue de Trévise, Paris 9e
Bro’s Pizza 📍 23 Rue d’Amsterdam, Paris 8e
COCOQ 📍 75 Rue Taitbout, 9e
Hallyu Kitchen 📍 6 Rue Henry Monnier, 9e
The Smoked Meat 📍 17 Rue Sedaine, 11eVoir tous les commentaires`

describe('stripEmbedChrome', () => {
  // Ce texte se collait à la DERNIÈRE adresse de la liste
  // (« 17 Rue Sedaine, 11eVoir tous les commentaires ») et polluait aussi la
  // légende affichée sur la fiche.
  it('retire le texte d’interface d’Instagram', () => {
    expect(stripEmbedChrome('Super resto\nVoir tous les commentaires')).toBe('Super resto')
    expect(stripEmbedChrome('Super resto Voir les 28 commentaires')).toBe('Super resto')
    expect(stripEmbedChrome('Nice spot View all 42 comments')).toBe('Nice spot')
  })

  it('ne touche pas à une légende propre', () => {
    expect(stripEmbedChrome('Les meilleurs ramen du 5e')).toBe('Les meilleurs ramen du 5e')
  })
})

describe('extractVenueList — форme « Nom 📍 adresse »', () => {
  const venues = extractVenueList(stripEmbedChrome(LISTE_PIN))

  // ⚠️ La détection n'acceptait QUE la forme « Nom @pseudo ». Une légende
  // listant cinq restaurants avec un 📍 et une adresse n'en rendait AUCUN, et
  // le post retombait sur une seule adresse.
  it('détecte les cinq adresses', () => {
    expect(venues).toHaveLength(5)
  })

  // `trailingName` ne garde que la fin capitalisée : il amputait
  // « Violetta & Alfredo » en « Alfredo ».
  it('garde le nom entier', () => {
    expect(venues[0].name).toBe('Violetta & Alfredo')
  })

  it('récupère l’adresse de chaque ligne', () => {
    expect(venues[0].address).toBe('30 Rue de Trévise, Paris 9e')
    expect(venues[4].address).toBe('17 Rue Sedaine, 11e')
  })

  it('n’invente pas de pseudo', () => {
    expect(venues.every((v) => v.handle === null)).toBe(true)
  })

  // Le seuil de la fonctionnalité liste est de trois adresses.
  it('dépasse le seuil qui déclenche une liste', () => {
    expect(venues.length).toBeGreaterThanOrEqual(3)
  })
})

describe('extractVenueList — l’ancienne forme reste supportée', () => {
  it('lit encore « Nom @pseudo »', () => {
    const v = extractVenueList(
      [
        '3 adresses à Paris',
        '– Melané @melane_paris',
        '– Gloria @gloriaosteria',
        '– Septime @septime',
      ].join('\n')
    )
    expect(v.length).toBeGreaterThanOrEqual(3)
    expect(v[0].handle).toBe('melane_paris')
  })

  // Une ligne de prose n'est pas une adresse.
  it('ignore une simple mention', () => {
    expect(extractVenueList('merci @mon_ami pour la découverte')).toHaveLength(0)
  })
})
