import { describe, it, expect } from 'vitest'
import { resolveListAccess, canEdit } from '@/lib/list-access'

describe('resolveListAccess', () => {
  it('returns owner for the list owner', () => {
    expect(resolveListAccess('owner', ['a', 'b'], 'owner')).toBe('owner')
  })
  it('returns collaborator for a collaborator', () => {
    expect(resolveListAccess('owner', ['a', 'b'], 'b')).toBe('collaborator')
  })
  it('returns none for an unrelated user', () => {
    expect(resolveListAccess('owner', ['a', 'b'], 'stranger')).toBe('none')
  })
  it('returns none for an anonymous user', () => {
    expect(resolveListAccess('owner', ['a'], null)).toBe('none')
    expect(resolveListAccess('owner', ['a'], undefined)).toBe('none')
  })
  it('owner wins even if also listed as collaborator', () => {
    expect(resolveListAccess('owner', ['owner'], 'owner')).toBe('owner')
  })
})

describe('canEdit', () => {
  it('is true for owner and collaborators, false otherwise', () => {
    expect(canEdit('owner', ['a'], 'owner')).toBe(true)
    expect(canEdit('owner', ['a'], 'a')).toBe(true)
    expect(canEdit('owner', ['a'], 'x')).toBe(false)
    expect(canEdit('owner', [], null)).toBe(false)
  })
})
