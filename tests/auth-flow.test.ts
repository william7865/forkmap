import { describe, it, expect } from 'vitest'
import { resolveInitialStep, signupProgress } from '@/lib/auth-flow'

describe('resolveInitialStep', () => {
  it('authed without profile resumes at handle (Google return / legacy)', () => {
    expect(resolveInitialStep(true, false)).toBe('handle')
  })
  it('not authed starts at welcome', () => {
    expect(resolveInitialStep(false, false)).toBe('welcome')
  })
  it('authed with profile starts at welcome (caller closes anyway)', () => {
    expect(resolveInitialStep(true, true)).toBe('welcome')
  })
})

describe('signupProgress', () => {
  it('maps signup steps to 1..4 / 4', () => {
    expect(signupProgress('email')).toEqual({ index: 1, total: 4 })
    expect(signupProgress('handle')).toEqual({ index: 2, total: 4 })
    expect(signupProgress('avatar')).toEqual({ index: 3, total: 4 })
    expect(signupProgress('taste')).toEqual({ index: 4, total: 4 })
  })
  it('returns null for non-signup steps', () => {
    expect(signupProgress('welcome')).toBeNull()
    expect(signupProgress('signin')).toBeNull()
    expect(signupProgress('done')).toBeNull()
  })
})
