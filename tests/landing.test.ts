import { describe, it, expect } from 'vitest'
import { mapDeepLinkTarget } from '@/lib/landing'

describe('mapDeepLinkTarget', () => {
  it('returns null for a plain landing visit', () => {
    expect(mapDeepLinkTarget('')).toBeNull()
    expect(mapDeepLinkTarget('?utm_source=twitter')).toBeNull()
  })

  it('forwards a shared restaurant link to the map', () => {
    expect(mapDeepLinkTarget('?select=node%2F123')).toBe('/carte?select=node%2F123')
  })

  it('forwards an auth-guard bounce to the map', () => {
    expect(mapDeepLinkTarget('?auth=required')).toBe('/carte?auth=required')
  })

  it('forwards the surprise deep-link', () => {
    expect(mapDeepLinkTarget('?surprise=1')).toBe('/carte?surprise=1')
  })

  it('keeps lat/lon alongside a select', () => {
    const out = mapDeepLinkTarget('?select=node%2F9&lat=48.8&lon=2.3')
    expect(out).toBe('/carte?select=node%2F9&lat=48.8&lon=2.3')
  })

  it('preserves unrelated params when a map param is present', () => {
    expect(mapDeepLinkTarget('?utm=x&auth=required')).toBe('/carte?utm=x&auth=required')
  })

  it('accepts a search string without the leading ?', () => {
    expect(mapDeepLinkTarget('select=node%2F1')).toBe('/carte?select=node%2F1')
  })
})
