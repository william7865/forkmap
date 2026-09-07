import { describe, it, expect } from 'vitest'
import {
  markerPopDelay,
  MARKER_POP_STEP_MS,
  MARKER_POP_MAX_MS,
  staggerDelay,
  STAGGER_STEP_MS,
  STAGGER_CAP,
} from '@/lib/motion'

describe('markerPopDelay', () => {
  it('démarre à zéro pour le premier marqueur', () => {
    expect(markerPopDelay(0)).toBe(0)
  })

  it('avance d’un pas par marqueur', () => {
    expect(markerPopDelay(1)).toBe(MARKER_POP_STEP_MS)
    expect(markerPopDelay(5)).toBe(5 * MARKER_POP_STEP_MS)
  })

  // Le vrai risque : la carte affiche couramment 200+ restaurants. Sans
  // plafond, la cascade durerait ~3 secondes et la carte semblerait ramer.
  it('plafonne, quel que soit le nombre de restaurants', () => {
    expect(markerPopDelay(239)).toBe(MARKER_POP_MAX_MS)
    expect(markerPopDelay(10_000)).toBe(MARKER_POP_MAX_MS)
  })

  it('atteint le plafond sans jamais le dépasser', () => {
    const atCap = Math.ceil(MARKER_POP_MAX_MS / MARKER_POP_STEP_MS)
    expect(markerPopDelay(atCap)).toBe(MARKER_POP_MAX_MS)
    expect(markerPopDelay(atCap - 1)).toBeLessThanOrEqual(MARKER_POP_MAX_MS)
  })

  // Un animation-delay négatif ne retarde pas en CSS : il démarre l'animation
  // en plein milieu. Le marqueur apparaîtrait déjà à moitié gonflé.
  it('borne les index négatifs et fractionnaires', () => {
    expect(markerPopDelay(-1)).toBe(0)
    expect(markerPopDelay(-999)).toBe(0)
    expect(markerPopDelay(2.9)).toBe(2 * MARKER_POP_STEP_MS)
  })
})

describe('staggerDelay', () => {
  it('renvoie une durée CSS exploitable', () => {
    expect(staggerDelay(0)).toBe('0ms')
    expect(staggerDelay(2)).toBe(`${2 * STAGGER_STEP_MS}ms`)
  })

  it('avance d’un pas par élément', () => {
    expect(staggerDelay(1)).toBe(`${STAGGER_STEP_MS}ms`)
    expect(staggerDelay(3)).toBe(`${3 * STAGGER_STEP_MS}ms`)
  })

  it('plafonne les longues listes', () => {
    const capped = `${STAGGER_CAP * STAGGER_STEP_MS}ms`
    expect(staggerDelay(STAGGER_CAP)).toBe(capped)
    expect(staggerDelay(STAGGER_CAP + 5)).toBe(capped)
    expect(staggerDelay(999)).toBe(capped)
  })

  // Couverture d'origine, restaurée : elle avait été perdue en réécrivant ce
  // fichier au lieu de le compléter.
  it('borne les index négatifs et fractionnaires', () => {
    expect(staggerDelay(-3)).toBe('0ms')
    expect(staggerDelay(2.9)).toBe(`${2 * STAGGER_STEP_MS}ms`)
  })
})
