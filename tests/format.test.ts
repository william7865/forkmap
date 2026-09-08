import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  timeAgo,
  relDate,
  formatShortDate,
  initials,
  priceLabel,
  formatWalkTime,
  closingTime,
} from '@/lib/format'

const NOW = new Date('2026-08-18T12:00:00Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString()
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

describe('timeAgo', () => {
  it('renvoie "à l\'instant" sous la minute', () => {
    expect(timeAgo(minutesAgo(0.5))).toBe("à l'instant")
  })
  it('affiche les minutes, heures, jours et semaines', () => {
    expect(timeAgo(minutesAgo(5))).toBe('il y a 5 min')
    expect(timeAgo(minutesAgo(120))).toBe('il y a 2 h')
    expect(timeAgo(daysAgo(3))).toBe('il y a 3 j')
    expect(timeAgo(daysAgo(15))).toBe('il y a 2 sem')
  })
})

describe('relDate', () => {
  it("aujourd'hui / hier / jours / semaines", () => {
    expect(relDate(daysAgo(0))).toBe("aujourd'hui")
    expect(relDate(daysAgo(1))).toBe('hier')
    expect(relDate(daysAgo(3))).toBe('il y a 3 j')
    expect(relDate(daysAgo(14))).toBe('il y a 2 sem')
  })
  it('retombe sur une date longue au-delà de 30 jours', () => {
    expect(relDate(daysAgo(40))).toBe(formatShortDate(daysAgo(40)))
  })
})

describe('initials', () => {
  it('deux initiales majuscules max', () => {
    expect(initials('Marie Dupont')).toBe('MD')
    expect(initials('marie dupont durand')).toBe('MD')
    expect(initials('Léa')).toBe('L')
  })
  it('retombe sur "?" pour une chaîne vide', () => {
    expect(initials('  ')).toBe('?')
  })
})

describe('priceLabel', () => {
  it('répète € selon le palier, vide si inconnu', () => {
    expect(priceLabel(undefined)).toBe('')
    expect(priceLabel(1)).toBe('€')
    expect(priceLabel(3)).toBe('€€€')
  })
})

describe('formatWalkTime', () => {
  it('vide si inconnu, "À côté" sous la minute, sinon minutes', () => {
    expect(formatWalkTime(undefined)).toBe('')
    expect(formatWalkTime(30)).toBe('À côté')
    expect(formatWalkTime(800)).toBe('10 min')
  })
})

describe('closingTime', () => {
  it('lit l’heure de fermeture d’une plage simple', () => {
    expect(closingTime('11:00–19:00')).toBe('19:00')
  })

  // Un service coupé ferme le SOIR. Prendre la première plage annoncerait
  // « jusqu'à 14:30 » à quelqu'un qui cherche où dîner.
  it('prend la dernière plage quand le service est coupé', () => {
    expect(closingTime('12:00–14:30, 19:00–22:00')).toBe('22:00')
  })

  it('n’invente rien quand ce n’est pas une plage', () => {
    expect(closingTime('Ouvert 24h/24')).toBeNull()
    expect(closingTime('Fermé')).toBeNull()
    expect(closingTime('')).toBeNull()
    expect(closingTime(undefined)).toBeNull()
  })
})
