import { describe, it, expect } from 'vitest'
import { relationFrom } from '@/lib/friends'

const ME = 'me-id'
const OTHER = 'other-id'

describe('relationFrom', () => {
  it('no row → none', () => {
    expect(relationFrom(null, ME)).toBe('none')
  })
  it('accepted → friends (either direction)', () => {
    expect(relationFrom({ requester_id: ME, addressee_id: OTHER, status: 'accepted' }, ME)).toBe(
      'friends'
    )
    expect(relationFrom({ requester_id: OTHER, addressee_id: ME, status: 'accepted' }, ME)).toBe(
      'friends'
    )
  })
  it('pending I sent → pending_sent', () => {
    expect(relationFrom({ requester_id: ME, addressee_id: OTHER, status: 'pending' }, ME)).toBe(
      'pending_sent'
    )
  })
  it('pending I received → pending_received', () => {
    expect(relationFrom({ requester_id: OTHER, addressee_id: ME, status: 'pending' }, ME)).toBe(
      'pending_received'
    )
  })
})
