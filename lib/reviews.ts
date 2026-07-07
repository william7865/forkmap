// ============================================================
// lib/reviews.ts — pure helpers for community reviews.
// No network / no React here so it stays trivially testable.
// ============================================================

import type { ReviewSummary } from '@/types'

export const REVIEW_TEXT_MAX = 500
export const REVIEW_PHOTOS_MAX = 4

/** Aggregate a list of ratings into `{ count, average }` (average = 0 when empty). */
export function computeSummary(reviews: ReadonlyArray<{ rating: number }>): ReviewSummary {
  const count = reviews.length
  if (count === 0) return { count: 0, average: 0 }
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
  return { count, average: Math.round((sum / count) * 10) / 10 }
}

export interface ReviewDraft {
  rating: number
  text: string
  photoCount: number
}

/** A draft is submittable when the rating is 1–5 and text/photos are within bounds. */
export function canSubmit(draft: ReviewDraft): boolean {
  const ratingOk = Number.isInteger(draft.rating) && draft.rating >= 1 && draft.rating <= 5
  const textOk = draft.text.length <= REVIEW_TEXT_MAX
  const photosOk = draft.photoCount >= 0 && draft.photoCount <= REVIEW_PHOTOS_MAX
  return ratingOk && textOk && photosOk
}
