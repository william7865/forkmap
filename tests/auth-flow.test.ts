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
  it('maps signup steps to 1..3 / 3', () => {
    expect(signupProgress('email')).toEqual({ index: 1, total: 3 })
    expect(signupProgress('handle')).toEqual({ index: 2, total: 3 })
    expect(signupProgress('avatar')).toEqual({ index: 3, total: 3 })
  })
  it('returns null for non-signup steps', () => {
    expect(signupProgress('welcome')).toBeNull()
    expect(signupProgress('signin')).toBeNull()
    expect(signupProgress('done')).toBeNull()
  })
})
