import { describe, it, expect } from 'vitest'
import { friendlyError } from '@/lib/api-errors'

describe('friendlyError', () => {
  it('maps PGRST116 to French', () => {
    expect(friendlyError('PGRST116: ...')).toBe('Aucun résultat trouvé.')
  })
  it('maps 23505 to French', () => {
    expect(friendlyError({ code: '23505' })).toBe('Déjà enregistré.')
  })
  it('maps network error', () => {
    expect(friendlyError('Failed to fetch')).toBe('Problème de connexion. Réessayez.')
  })
  it('returns generic message for unknown', () => {
    expect(friendlyError('something weird')).toBe('Une erreur est survenue. Réessayez.')
  })
  it('handles null/undefined', () => {
    expect(friendlyError(null)).toBe('Une erreur est survenue.')
    expect(friendlyError(undefined)).toBe('Une erreur est survenue.')
  })
})
