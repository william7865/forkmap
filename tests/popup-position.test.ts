import { describe, it, expect } from 'vitest'
import { clampPopupRight, POPUP_MARGIN } from '@/lib/popup-position'

const IPHONE = 390
const POPUP = 280

describe('clampPopupRight', () => {
  it('aligns with the anchor when there is room', () => {
    // Anchor at 330: aligning exactly gives 60, comfortably inside both margins.
    expect(clampPopupRight(330, IPHONE, POPUP)).toBe(IPHONE - 330)
  })

  it('holds the margin rather than aligning exactly against the edge', () => {
    // Anchor at 380 would align to 10 — inside the 12px margin, so the margin wins.
    expect(clampPopupRight(380, IPHONE, POPUP)).toBe(POPUP_MARGIN)
  })

  it('keeps the popup on screen when the anchor sits mid-screen', () => {
    // The real bug: a bookmark icon centred in a full-width button. Unclamped this
    // returned 233, putting the popup's left edge at -123.
    const right = clampPopupRight(157, IPHONE, POPUP)
    const leftEdge = IPHONE - right - POPUP
    expect(leftEdge).toBeGreaterThanOrEqual(0)
    expect(right).toBe(IPHONE - POPUP - POPUP_MARGIN)
  })

  it('never pins the popup flush against the right edge', () => {
    expect(clampPopupRight(IPHONE, IPHONE, POPUP)).toBe(POPUP_MARGIN)
  })

  it('stays within margin on a viewport narrower than the popup', () => {
    const narrow = 200
    const right = clampPopupRight(190, narrow, POPUP)
    expect(right).toBeGreaterThanOrEqual(POPUP_MARGIN)
    expect(right).toBeLessThanOrEqual(narrow)
  })

  it('never returns a negative offset', () => {
    for (const anchor of [0, 50, 157, 300, 390, 500]) {
      expect(clampPopupRight(anchor, IPHONE, POPUP)).toBeGreaterThanOrEqual(0)
    }
  })
})
