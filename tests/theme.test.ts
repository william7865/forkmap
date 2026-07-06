import { describe, it, expect } from 'vitest'
import { resolveTheme } from '@/lib/theme'

describe('resolveTheme', () => {
  it('is always light off-native (web keeps its paper look)', () => {
    expect(resolveTheme('dark', true, false)).toBe('light')
    expect(resolveTheme('auto', true, false)).toBe('light')
    expect(resolveTheme('light', false, false)).toBe('light')
  })

  it('honors an explicit native preference regardless of system', () => {
    expect(resolveTheme('dark', false, true)).toBe('dark')
    expect(resolveTheme('light', true, true)).toBe('light')
  })

  it('follows the system in auto mode on native', () => {
    expect(resolveTheme('auto', true, true)).toBe('dark')
    expect(resolveTheme('auto', false, true)).toBe('light')
  })
})
