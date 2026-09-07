import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

// Faux supabase-js v2 : `channel(topic)` réutilise l'instance existante pour un
// même topic, et ajouter un callback `postgres_changes` après `subscribe()`
// jette — exactement le comportement qui a produit le bug sur device quand la
// tab bar ET l'écran Découvrir montaient useUnreadMessages en même temps.
class FakeChannel {
  topic: string
  subscribed = false
  constructor(topic: string) {
    this.topic = topic
  }
  on(_type: string, _filter: unknown, _cb: () => void) {
    if (this.subscribed) {
      throw new Error(
        `cannot add \`postgres_changes\` callbacks for ${this.topic} after \`subscribe()\``
      )
    }
    return this
  }
  subscribe() {
    this.subscribed = true
    return this
  }
}

const channels = new Map<string, FakeChannel>()
const fakeClient = {
  channel(topic: string) {
    const existing = channels.get(topic)
    if (existing) return existing
    const ch = new FakeChannel(topic)
    channels.set(topic, ch)
    return ch
  },
  removeChannel(ch: FakeChannel) {
    channels.delete(ch.topic)
  },
}

let userId = 'user-a'
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: userId }, loading: false }),
  getSupabaseBrowserClient: () => fakeClient,
}))
vi.mock('@/lib/auth-headers', () => ({ getAuthHeaders: async () => ({}) }))
vi.mock('@/lib/api', () => ({
  apiFetch: async () => ({
    ok: true,
    json: async () => ({ data: [{ unread: 2 }, { unread: 1 }] }),
  }),
}))

import { useUnreadMessages } from '@/lib/hooks/useUnreadMessages'

function Badge({ label }: { label: string }) {
  const n = useUnreadMessages()
  return <span>{`${label}:${n}`}</span>
}

describe('useUnreadMessages', () => {
  it('supporte plusieurs abonnés simultanés (tab bar + Découvrir) sur un seul channel', async () => {
    await act(async () => {
      render(
        <>
          <Badge label="tab" />
          <Badge label="page" />
        </>
      )
    })
    expect(await screen.findByText('tab:3')).toBeInTheDocument()
    expect(screen.getByText('page:3')).toBeInTheDocument()
    // Un seul topic realtime quel que soit le nombre d'abonnés.
    expect(channels.size).toBe(1)
  })

  it("démonter un abonné ne coupe pas la souscription de l'autre", async () => {
    userId = 'user-b'
    function Screen({ showSecond }: { showSecond: boolean }) {
      return (
        <>
          <Badge label="tab" />
          {showSecond && <Badge label="page" />}
        </>
      )
    }
    const view = await act(async () => render(<Screen showSecond />))
    expect(await screen.findByText('tab:3')).toBeInTheDocument()

    await act(async () => {
      view.rerender(<Screen showSecond={false} />)
    })
    // Le badge restant garde son channel realtime actif.
    expect(channels.has('unread:user-b')).toBe(true)
    expect(screen.getByText('tab:3')).toBeInTheDocument()
  })
})
