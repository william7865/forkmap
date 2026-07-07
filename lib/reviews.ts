// ============================================================
// lib/reviews.ts — pure helpers for community reviews.
// No network / no React here so it stays trivially testable.
// ============================================================

import type { ReviewSummary } from '@/types'

export const REVIEW_TEXT_MAX = 500
export const REVIEW_PHOTOS_MAX = 4
/** Cap on how many photos the banner gallery shows (user photos + FSQ/Google). */
export const GALLERY_PHOTOS_MAX = 12

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

/**
 * Merge user-uploaded photo URLs (shown first — real, current) with the
 * FSQ/Google gallery URLs, de-duplicating and capping the total.
 */
export function mergePhotos(
  userUrls: ReadonlyArray<string>,
  fsqUrls: ReadonlyArray<string>,
  cap = GALLERY_PHOTOS_MAX
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const url of [...userUrls, ...fsqUrls]) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push(url)
    if (out.length >= cap) break
  }
  return out
}
