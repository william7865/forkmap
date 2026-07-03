// ============================================================
// lib/context.ts — "the moment" awareness for the decision engine
//   Pure, testable logic that reads the current time & weekday and
//   turns it into a point of view: a suggested mood + a human,
//   French headline for the Surprends-moi deck.
//
//   This is the thing a plain map/search can't do — it doesn't wait
//   for you to say what you want, it reads the moment and proposes.
//   Everything takes an injectable Date so it's deterministic in tests.
// ============================================================

import type { Mood } from '@/lib/surprise'

export type Meal = 'breakfast' | 'lunch' | 'afternoon' | 'dinner' | 'late'

export interface Moment {
  /** Local hour 0–23. */
  hour: number
  /** Local weekday, 0 = Sunday … 6 = Saturday (JS getDay convention). */
  day: number
  /** Saturday or Sunday. */
  isWeekend: boolean
  /** Coarse meal window derived from the hour. */
  meal: Meal
}

/** Map a local hour to a meal window. Exported for testing. */
export function mealForHour(hour: number): Meal {
  if (hour >= 6 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 15 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'dinner'
  return 'late' // 23:00–05:59
}

/** Read the current moment from a Date (defaults to now). */
export function getMoment(date: Date = new Date()): Moment {
  const hour = date.getHours()
  const day = date.getDay()
  return {
    hour,
    day,
    isWeekend: day === 0 || day === 6,
    meal: mealForHour(hour),
  }
}

const FRIDAY = 5
const SATURDAY = 6
const SUNDAY = 0

/** Is this the "going-out" window — Fri or Sat evening/night? */
function isGoingOut(m: Moment): boolean {
  return (m.meal === 'dinner' || m.meal === 'late') && (m.day === FRIDAY || m.day === SATURDAY)
}

/**
 * Mood the deck should open with, given the moment — or null to stay
 * neutral. The user can always tap it off; it's a proposal, not a lock.
 */
export function suggestedMood(m: Moment): Mood | null {
  if (isGoingOut(m)) return 'festive'
  switch (m.meal) {
    case 'breakfast':
      return null // no strong pull first thing
    case 'lunch':
      // Weekday lunch = a break between things → quick & close.
      return m.isWeekend ? null : 'fast'
    case 'afternoon':
      return null // in-between hours, let taste lead
    case 'dinner':
      return 'comfort' // weeknight/Sunday dinner → warm & familiar
    case 'late':
      return 'fast' // late-night = grab something now
  }
}

/**
 * A short, contextual label for the home editorial eyebrow (rendered
 * uppercase). Shorter than momentHeadline, which is a full sentence.
 */
export function momentEyebrow(m: Moment): string {
  switch (m.meal) {
    case 'breakfast':
      return 'Ce matin près de toi'
    case 'lunch':
      return m.isWeekend ? 'Pour déjeuner' : 'Pour la pause déj'
    case 'afternoon':
      return 'Un petit creux ?'
    case 'dinner':
      return 'Ce soir près de toi'
    case 'late':
      return 'Ouvert maintenant'
  }
}

/**
 * A short, human headline with a point of view for the deck header.
 * Google gives you a search box; this reads the moment and talks to you.
 */
export function momentHeadline(m: Moment): string {
  if (isGoingOut(m)) return 'C’est le week-end — on se fait plaisir ?'
  switch (m.meal) {
    case 'breakfast':
      return 'On commence par un petit-déj ?'
    case 'lunch':
      return m.isWeekend ? 'Déjeuner tranquille ?' : 'Pause déj — vite fait, bien fait ?'
    case 'afternoon':
      return 'Un petit creux cet après-midi ?'
    case 'dinner':
      return m.day === SUNDAY ? 'Dimanche soir, on cocoone ?' : 'Qu’est-ce qu’on mange ce soir ?'
    case 'late':
      return 'Petite faim nocturne ?'
  }
}
