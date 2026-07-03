import { describe, it, expect } from 'vitest'
import { getMoment, suggestedMood, momentHeadline, momentEyebrow, mealForHour } from '@/lib/context'

// Deterministic dates built from local components so getDay()/getHours()
// are timezone-independent. Reference weekdays (verified):
//   2026-01-01 = Thursday, 02 = Friday, 03 = Saturday, 04 = Sunday, 05 = Monday
const friDinner = new Date(2026, 0, 2, 20, 0, 0) // Fri 20:00
const satLate = new Date(2026, 0, 3, 23, 30, 0) // Sat 23:30
const monLunch = new Date(2026, 0, 5, 12, 30, 0) // Mon 12:30
const sunLunch = new Date(2026, 0, 4, 13, 0, 0) // Sun 13:00
const monMorning = new Date(2026, 0, 5, 8, 0, 0) // Mon 08:00
const sunDinner = new Date(2026, 0, 4, 20, 0, 0) // Sun 20:00
const monDinner = new Date(2026, 0, 5, 20, 0, 0) // Mon 20:00

describe('mealForHour', () => {
  it('maps hours to the right meal window', () => {
    expect(mealForHour(8)).toBe('breakfast')
    expect(mealForHour(12)).toBe('lunch')
    expect(mealForHour(16)).toBe('afternoon')
    expect(mealForHour(20)).toBe('dinner')
    expect(mealForHour(2)).toBe('late')
    expect(mealForHour(23)).toBe('late')
  })

  it('handles window boundaries', () => {
    expect(mealForHour(11)).toBe('lunch') // 11:00 is lunch, not breakfast
    expect(mealForHour(15)).toBe('afternoon')
    expect(mealForHour(18)).toBe('dinner')
    expect(mealForHour(6)).toBe('breakfast')
    expect(mealForHour(5)).toBe('late')
  })
})

describe('getMoment', () => {
  it('reads hour, day, weekend flag and meal', () => {
    const m = getMoment(friDinner)
    expect(m.hour).toBe(20)
    expect(m.day).toBe(5)
    expect(m.isWeekend).toBe(false) // Friday is not weekend by Sat/Sun rule
    expect(m.meal).toBe('dinner')
  })

  it('flags Saturday and Sunday as weekend', () => {
    expect(getMoment(satLate).isWeekend).toBe(true)
    expect(getMoment(sunLunch).isWeekend).toBe(true)
    expect(getMoment(monLunch).isWeekend).toBe(false)
  })
})

describe('suggestedMood', () => {
  it('proposes festive for Fri/Sat nights (going-out window)', () => {
    expect(suggestedMood(getMoment(friDinner))).toBe('festive')
    expect(suggestedMood(getMoment(satLate))).toBe('festive')
  })

  it('proposes fast for a weekday lunch break', () => {
    expect(suggestedMood(getMoment(monLunch))).toBe('fast')
  })

  it('stays neutral for a leisurely weekend lunch', () => {
    expect(suggestedMood(getMoment(sunLunch))).toBeNull()
  })

  it('stays neutral at breakfast', () => {
    expect(suggestedMood(getMoment(monMorning))).toBeNull()
  })

  it('proposes comfort for a weeknight/Sunday dinner', () => {
    expect(suggestedMood(getMoment(monDinner))).toBe('comfort')
    expect(suggestedMood(getMoment(sunDinner))).toBe('comfort')
  })
})

describe('momentHeadline', () => {
  it('gives a distinct point of view per moment', () => {
    const going = momentHeadline(getMoment(friDinner))
    const lunch = momentHeadline(getMoment(monLunch))
    const sunday = momentHeadline(getMoment(sunDinner))
    expect(going).toMatch(/week-end/i)
    expect(lunch).toMatch(/déj/i)
    expect(sunday).toMatch(/dimanche/i)
    // headlines should be non-empty and differ across moments
    expect(new Set([going, lunch, sunday]).size).toBe(3)
  })

  it('never returns an empty string for any hour', () => {
    for (let h = 0; h < 24; h++) {
      const m = getMoment(new Date(2026, 0, 5, h, 0, 0))
      expect(momentHeadline(m).length).toBeGreaterThan(0)
    }
  })
})

describe('momentEyebrow', () => {
  it('gives a short contextual label per moment', () => {
    expect(momentEyebrow(getMoment(monMorning))).toMatch(/matin/i)
    expect(momentEyebrow(getMoment(monLunch))).toMatch(/déj/i)
    expect(momentEyebrow(getMoment(monDinner))).toMatch(/soir/i)
    expect(momentEyebrow(getMoment(satLate))).toMatch(/ouvert/i)
  })

  it('never returns an empty string for any hour', () => {
    for (let h = 0; h < 24; h++) {
      expect(momentEyebrow(getMoment(new Date(2026, 0, 5, h, 0, 0))).length).toBeGreaterThan(0)
    }
  })
})
