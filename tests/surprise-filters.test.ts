import { describe, it, expect } from 'vitest'
import { hasActiveDeckFilters } from '@/lib/surprise'

describe('hasActiveDeckFilters', () => {
  // Sert à distinguer deux écrans vides qui se ressemblent : « tu as tout vu »
  // et « rien ne passe tes filtres ». Le second proposait « Rejouer », qui
  // reconstruisait le MÊME deck vide — le bouton semblait cassé.
  it('reconnaît chaque critère', () => {
    expect(hasActiveDeckFilters({ mood: 'cosy' })).toBe(true)
    expect(hasActiveDeckFilters({ maxPrice: 2 })).toBe(true)
    expect(hasActiveDeckFilters({ maxDistance: 1000 })).toBe(true)
    expect(hasActiveDeckFilters({ openNow: true })).toBe(true)
  })

  it('reste faux sans aucun critère', () => {
    expect(hasActiveDeckFilters({})).toBe(false)
    expect(
      hasActiveDeckFilters({ mood: null, maxPrice: null, maxDistance: null, openNow: false })
    ).toBe(false)
  })

  // `openNow: false` est un état par défaut, pas un filtre.
  it('ne prend pas « ouvert maintenant » désactivé pour un filtre', () => {
    expect(hasActiveDeckFilters({ openNow: false })).toBe(false)
  })

  // Un prix de 0 n'existe pas dans le barème (1 à 4), mais s'il arrivait il
  // resterait un choix explicite — le test fige le comportement.
  it('traite zéro comme une valeur, pas comme une absence', () => {
    expect(hasActiveDeckFilters({ maxPrice: 0 })).toBe(true)
    expect(hasActiveDeckFilters({ maxDistance: 0 })).toBe(true)
  })
})
