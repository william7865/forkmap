// ============================================================
// lib/popup-position.ts
// Placing a popup that hangs off an anchor, without letting it leave the screen.
// ============================================================

/** Gap kept between the popup and either screen edge. */
export const POPUP_MARGIN = 12

/**
 * The `right` offset for a popup whose right edge should line up with its
 * anchor's.
 *
 * Naively that's `viewportWidth - anchorRight`. But the anchor is often an icon
 * sitting inside a much wider button, so on a phone its right edge lands
 * mid-screen and the popup — anchored there and growing leftwards — hangs its
 * whole left half off the viewport (the "…STRER DANS…" clipping). This clamps
 * the offset so the popup always keeps POPUP_MARGIN on both sides.
 *
 * Returns a `right` in CSS pixels, for `position: fixed`.
 */
export function clampPopupRight(
  anchorRight: number,
  viewportWidth: number,
  popupMaxWidth: number,
  margin: number = POPUP_MARGIN
): number {
  const width = Math.min(popupMaxWidth, viewportWidth - margin * 2)
  const maxRight = viewportWidth - width - margin
  const desired = viewportWidth - anchorRight
  // maxRight can fall below margin on a viewport narrower than the popup; clamp
  // low first so the result never exceeds it and pushes the popup off the left.
  return Math.min(Math.max(desired, margin), Math.max(maxRight, margin))
}
