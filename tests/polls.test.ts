import { describe, it, expect } from 'vitest'
import { tallyVotes } from '@/lib/polls'

const v = (option_id: string) => ({ option_id })

describe('tallyVotes', () => {
  it('counts votes and computes percentages', () => {
    const r = tallyVotes(['a', 'b', 'c'], [v('a'), v('a'), v('a'), v('b')])
    expect(r.total).toBe(4)
    const by = Object.fromEntries(r.tallies.map((t) => [t.optionId, t]))
    expect(by.a.votes).toBe(3)
    expect(by.a.pct).toBe(75)
    expect(by.b.pct).toBe(25)
    expect(by.c.votes).toBe(0)
    expect(by.c.pct).toBe(0)
  })

  it('includes zero-vote options', () => {
    const r = tallyVotes(['a', 'b'], [])
    expect(r.total).toBe(0)
    expect(r.tallies).toHaveLength(2)
    expect(r.tallies.every((t) => t.votes === 0 && t.pct === 0)).toBe(true)
  })

  it('picks a strict winner', () => {
    const r = tallyVotes(['a', 'b'], [v('a'), v('a'), v('b')])
    expect(r.winnerId).toBe('a')
  })

  it('returns null winner on a tie', () => {
    const r = tallyVotes(['a', 'b'], [v('a'), v('b')])
    expect(r.winnerId).toBeNull()
  })

  it('returns null winner with no votes', () => {
    expect(tallyVotes(['a', 'b'], []).winnerId).toBeNull()
  })

  it('ignores votes for unknown options', () => {
    const r = tallyVotes(['a'], [v('a'), v('ghost')])
    expect(r.total).toBe(1)
    expect(r.tallies[0].votes).toBe(1)
  })
})
