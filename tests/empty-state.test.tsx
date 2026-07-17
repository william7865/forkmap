import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState, { type EmptyVariant } from '@/components/states/EmptyState'

const VARIANTS: EmptyVariant[] = [
  'no-results',
  'no-favorites',
  'no-area',
  'no-location',
  'no-visits',
  'no-tested',
  'all-tested',
  'no-lists',
]

// Forkmap tutoie. The two voices had drifted apart (EmptyState vouvoyait pendant
// que la page Favoris tutoyait), so this pins the voice rather than trusting review.
const VOUVOIEMENT = /\b(appuyez|déplacez|définissez|vos|votre|réessayez|consignez|ouvrez|créez)\b/i

describe('EmptyState', () => {
  it.each(VARIANTS)('%s renders a title and a description', (variant) => {
    const { container } = render(<EmptyState variant={variant} />)
    const text = container.textContent ?? ''
    expect(text.length).toBeGreaterThan(20)
  })

  it.each(VARIANTS)('%s tutoie', (variant) => {
    const { container } = render(<EmptyState variant={variant} />)
    expect(container.textContent ?? '').not.toMatch(VOUVOIEMENT)
  })

  it('interpolates the search query into no-results', () => {
    render(<EmptyState variant="no-results" searchQuery="ramen" />)
    expect(screen.getByText(/ramen/)).toBeInTheDocument()
  })

  it('hides the CTA when no handler is passed', () => {
    render(<EmptyState variant="no-favorites" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows the CTA when a handler is passed', () => {
    render(<EmptyState variant="no-favorites" onExplore={() => {}} />)
    expect(screen.getByRole('button')).toHaveTextContent('Explorer la carte')
  })
})
