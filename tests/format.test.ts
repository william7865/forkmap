import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  timeAgo,
  relDate,
  formatShortDate,
  initials,
  priceLabel,
  formatWalkTime,
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
