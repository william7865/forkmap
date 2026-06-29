import { describe, it, expect } from 'vitest'
import { frCuisine } from '@/lib/cuisine'

describe('frCuisine', () => {
  it('translates known cuisines case-insensitively', () => {
    expect(frCuisine('italian')).toBe('Italien')
    expect(frCuisine('French')).toBe('Français')
    expect(frCuisine('BURGER')).toBe('Burger')
    expect(frCuisine('japanese')).toBe('Japonais')
  })
  it('takes the first of multiple values', () => {
    expect(frCuisine('sushi;japanese')).toBe('Sushi')
    expect(frCuisine('pizza,italian')).toBe('Pizza')
  })
  it('capitalizes unknown cuisines', () => {
    expect(frCuisine('fusion_experimental')).toBe('Fusion experimental')
  })
  it('returns empty string for empty input', () => {
    expect(frCuisine('')).toBe('')
    expect(frCuisine('   ')).toBe('')
  })
})
