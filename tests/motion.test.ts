import { describe, it, expect } from 'vitest'
import { staggerDelay, STAGGER_STEP_MS, STAGGER_CAP } from '@/lib/motion'

describe('staggerDelay', () => {
  it('returns 0ms for the first item', () => {
    expect(staggerDelay(0)).toBe('0ms')
  })

  it('increments by the step for each item', () => {
    expect(staggerDelay(1)).toBe(`${STAGGER_STEP_MS}ms`)
    expect(staggerDelay(3)).toBe(`${3 * STAGGER_STEP_MS}ms`)
  })

  it('caps long lists at the max delay', () => {
    const max = `${STAGGER_CAP * STAGGER_STEP_MS}ms`
    expect(staggerDelay(STAGGER_CAP)).toBe(max)
    expect(staggerDelay(STAGGER_CAP + 5)).toBe(max)
    expect(staggerDelay(999)).toBe(max)
  })

  it('clamps negative and fractional indices', () => {
    expect(staggerDelay(-3)).toBe('0ms')
    expect(staggerDelay(2.9)).toBe(`${2 * STAGGER_STEP_MS}ms`)
  })

  it('honours custom step and cap', () => {
    expect(staggerDelay(2, 60, 4)).toBe('120ms')
    expect(staggerDelay(10, 60, 4)).toBe('240ms')
  })
})
