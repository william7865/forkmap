import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToastApi } from '@/lib/hooks/useToastContext'

// A consumer mounted arbitrarily deep — the whole point of the provider is that
// screens like Favoris/Compte and the modals they render can acknowledge an
// action without a <ToastStack> of their own.
function DeepConsumer() {
  const toast = useToastApi()
  return (
    <div>
      <button onClick={() => toast.success('Ajouté à « Test »')}>save</button>
      <button onClick={() => toast.error('Ça a raté')}>fail</button>
    </div>
  )
}

describe('ToastProvider', () => {
  it('renders a toast raised by a nested consumer', async () => {
    render(
      <ToastProvider>
        <div>
          <DeepConsumer />
        </div>
      </ToastProvider>
    )
    expect(screen.queryByText('Ajouté à « Test »')).toBeNull()

    await act(async () => {
      screen.getByText('save').click()
    })
    expect(screen.getByText('Ajouté à « Test »')).toBeInTheDocument()
  })

  it('marks error toasts as alerts so they are announced', async () => {
    render(
      <ToastProvider>
        <DeepConsumer />
      </ToastProvider>
    )
    await act(async () => {
      screen.getByText('fail').click()
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Ça a raté')
  })

  it('no-ops outside the provider instead of crashing', () => {
    // Consumers rendered in isolation (tests, stories) must not blow up.
    expect(() => render(<DeepConsumer />)).not.toThrow()
    expect(() => screen.getByText('save').click()).not.toThrow()
  })
})
