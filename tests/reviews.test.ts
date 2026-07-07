import { describe, it, expect } from 'vitest'
import { computeSummary, canSubmit, REVIEW_TEXT_MAX, REVIEW_PHOTOS_MAX } from '@/lib/reviews'

describe('computeSummary', () => {
  it('returns zero for an empty list', () => {
    expect(computeSummary([])).toEqual({ count: 0, average: 0 })
  })

  it('averages and rounds to one decimal', () => {
    expect(computeSummary([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toEqual({
      count: 3,
      average: 4.3,
    })
  })

  it('handles a single review', () => {
    expect(computeSummary([{ rating: 3 }])).toEqual({ count: 1, average: 3 })
  })
})

describe('canSubmit', () => {
  it('accepts a valid draft', () => {
    expect(canSubmit({ rating: 4, text: 'Super', photoCount: 2 })).toBe(true)
  })

  it('accepts note-only (no text, no photos)', () => {
    expect(canSubmit({ rating: 5, text: '', photoCount: 0 })).toBe(true)
  })

  it('rejects a missing/out-of-range rating', () => {
    expect(canSubmit({ rating: 0, text: 'x', photoCount: 0 })).toBe(false)
    expect(canSubmit({ rating: 6, text: 'x', photoCount: 0 })).toBe(false)
    expect(canSubmit({ rating: 2.5, text: 'x', photoCount: 0 })).toBe(false)
  })

  it('rejects text over the max', () => {
    expect(canSubmit({ rating: 3, text: 'a'.repeat(REVIEW_TEXT_MAX + 1), photoCount: 0 })).toBe(
      false
    )
  })

  it('rejects more photos than allowed', () => {
    expect(canSubmit({ rating: 3, text: '', photoCount: REVIEW_PHOTOS_MAX + 1 })).toBe(false)
  })
})
