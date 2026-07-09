// ============================================================
// tests/overpass-injection.test.ts
//
// `buildOverpassQuery` interpolates amenity types into Overpass QL string
// literals. The route used to hand it `s.split(',') as Array<AmenityType>` —
// a compile-time cast with no runtime check — so `?types=…` could break out of
// the literal and append arbitrary statements. The builder now filters, and
// must keep doing so regardless of what its caller validated.
// ============================================================

import { describe, it, expect } from 'vitest'
import { buildOverpassQuery, AMENITY_TYPES } from '@/lib/overpass'
import type { OverpassParams } from '@/types'

const BBOX = { minLat: 48.85, minLon: 2.3, maxLat: 48.87, maxLon: 2.35 }

/** Cast through unknown: the point of the test is to pass values the type forbids. */
function build(types: string[]): string {
  return buildOverpassQuery({ ...BBOX, includeTypes: types } as unknown as OverpassParams)
}

describe('buildOverpassQuery — injection', () => {
  it('emits a filter for each known amenity', () => {
    const q = buildOverpassQuery({ ...BBOX, includeTypes: ['restaurant', 'cafe'] })
    expect(q).toContain('node["amenity"="restaurant"]')
    expect(q).toContain('node["amenity"="cafe"]')
    expect(q).not.toContain('"bar"')
  })

  it('drops a type that closes the string literal and appends statements', () => {
    const payload = 'restaurant"](-90,-180,90,180);out;//'
    const q = build([payload])
    expect(q).not.toContain(payload)
    expect(q).not.toContain('-90,-180,90,180')
    // Nothing injected survived; the fallback filter is the only one present.
    expect(q).toContain('node["amenity"="restaurant"]')
  })

  it('keeps the legitimate types and drops the hostile one', () => {
    const q = build(['cafe', 'bar"];out;//'])
    expect(q).toContain('node["amenity"="cafe"]')
    expect(q).not.toContain('out;//')
  })

  it('falls back to restaurant when every type is rejected', () => {
    const q = build(['../../etc/passwd', '"; drop'])
    expect(q).toContain('node["amenity"="restaurant"]')
    expect(q).not.toContain('passwd')
    expect(q).not.toContain('drop')
  })

  it('coerces the bbox to numbers, so it cannot carry a payload', () => {
    const q = buildOverpassQuery({
      ...BBOX,
      minLat: '48.85);out;//' as unknown as number,
      includeTypes: ['restaurant'],
    })
    expect(q).not.toContain('out;//')
    expect(q).toContain('NaN')
  })

  it('exports the allowlist the route validates against', () => {
    expect([...AMENITY_TYPES]).toEqual(['restaurant', 'fast_food', 'cafe', 'bar'])
  })
})
