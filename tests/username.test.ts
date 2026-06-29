import { describe, it, expect } from 'vitest'
import { validateUsername, canChangeUsername } from '@/lib/username'

describe('validateUsername', () => {
  it('accepts and lowercases a valid handle', () => {
    expect(validateUsername('  Marie_42 ')).toEqual({ ok: true, username: 'marie_42' })
  })
  it('rejects too short', () => {
    const r = validateUsername('ab')
    expect(r.ok).toBe(false)
  })
  it('rejects invalid chars', () => {
    expect(validateUsername('marie!').ok).toBe(false)
    expect(validateUsername('a b').ok).toBe(false)
  })
  it('rejects too long', () => {
    expect(validateUsername('a'.repeat(21)).ok).toBe(false)
  })
})

describe('canChangeUsername', () => {
  const NOW = 1_700_000_000_000
  const YEAR = 365 * 24 * 3600 * 1000
  it('allows when never changed', () => {
    expect(canChangeUsername(null, NOW)).toEqual({ ok: true })
  })
  it('blocks within 365 days and returns next date', () => {
    const last = new Date(NOW - YEAR / 2).toISOString()
    const r = canChangeUsername(last, NOW)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(new Date(r.nextChangeAt).getTime()).toBe(new Date(last).getTime() + YEAR)
  })
  it('allows after 365 days', () => {
    const last = new Date(NOW - YEAR - 1000).toISOString()
    expect(canChangeUsername(last, NOW)).toEqual({ ok: true })
  })
})
