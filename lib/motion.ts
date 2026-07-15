// ============================================================
// lib/motion.ts
// Shared entry-motion helper. One orchestrated entrance per screen:
// the serif masthead enters first, then sections, then rows cascade in
// with a small incremental delay. The delay is CAPPED so a long list
// doesn't keep animating for seconds — items past the cap share the max
// delay. Entry animations reuse the keyframes/easings already defined in
// app/globals.css (fadeUp, cardIn, --ease-out…). Reduced motion is
// neutralised globally in globals.css (durations AND delays zeroed).
// ============================================================

/** Milliseconds added between two consecutive items of a cascading list. */
export const STAGGER_STEP_MS = 40

/** Items past this index all share the same (max) delay — keeps long lists snappy. */
export const STAGGER_CAP = 10

/**
 * Delay for the Nth item of a cascading list, as a CSS time string.
 * Capped so long lists don't animate for seconds.
 *
 * @example style={{ animationDelay: staggerDelay(index) }}
 */
export function staggerDelay(
  index: number,
  step: number = STAGGER_STEP_MS,
  cap: number = STAGGER_CAP
): string {
  const clamped = Math.min(Math.max(Math.trunc(index), 0), cap)
  return `${clamped * step}ms`
}
