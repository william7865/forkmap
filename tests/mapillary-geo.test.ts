// Geometry behind the "does this street photo actually face the restaurant?"
// filter. A sign error here silently degrades photo relevance (we'd surface
// shots of the opposite pavement), so it's worth pinning down.
import { describe, it, expect } from 'vitest'
import { bearing, angleDiff } from '@/lib/mapillary'

describe('bearing', () => {
  const lat = 48.8566
  const lon = 2.3522

  it('points north when the target is due north', () => {
    expect(bearing(lat, lon, lat + 0.001, lon)).toBeCloseTo(0, 0)
  })

  it('points east when the target is due east', () => {
    expect(bearing(lat, lon, lat, lon + 0.001)).toBeCloseTo(90, 0)
  })

  it('points south when the target is due south', () => {
    expect(bearing(lat, lon, lat - 0.001, lon)).toBeCloseTo(180, 0)
  })

  it('points west when the target is due west', () => {
    expect(bearing(lat, lon, lat, lon - 0.001)).toBeCloseTo(270, 0)
  })
})

describe('angleDiff', () => {
  it('is zero for equal headings', () => {
    expect(angleDiff(90, 90)).toBe(0)
  })

  it('takes the short way around the circle', () => {
    expect(angleDiff(350, 10)).toBe(20)
    expect(angleDiff(10, 350)).toBe(20)
  })

  it('caps at 180', () => {
    expect(angleDiff(0, 180)).toBe(180)
    expect(angleDiff(0, 190)).toBe(170)
  })
})
