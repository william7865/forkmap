import { describe, it, expect } from 'vitest'
import { parseAdminIds } from '@/lib/admin'

describe('parseAdminIds', () => {
  it('returns an empty set for undefined/empty', () => {
    expect(parseAdminIds(undefined).size).toBe(0)
    expect(parseAdminIds('').size).toBe(0)
    expect(parseAdminIds('  ').size).toBe(0)
  })

  it('splits on commas and whitespace, trimming', () => {
    const s = parseAdminIds('a1, b2 ,c3')
    expect([...s].sort()).toEqual(['a1', 'b2', 'c3'])
  })

  it('dedups and ignores empties', () => {
    const s = parseAdminIds('a1,,a1, ,b2')
    expect([...s].sort()).toEqual(['a1', 'b2'])
  })
})
