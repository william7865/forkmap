'use client'
// Présence « en ligne » GLOBALE : dès que l'app est ouverte (n'importe quel écran),
// l'utilisateur rejoint un canal Realtime unique et se déclare présent. Les amis le
// voient donc en ligne partout (chat, inbox…), pas seulement dans une conversation.
// Singleton (un seul canal pour toute l'app) + store abonnable (useSyncExternalStore).
import { useSyncExternalStore } from 'react'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Channel = any

const EMPTY: ReadonlySet<string> = new Set()
let channel: Channel = null
let currentUserId: string | null = null
let online: ReadonlySet<string> = EMPTY
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function startPresence(userId: string): void {
  if (!userId || currentUserId === userId) return
  stopPresence()
  currentUserId = userId
  const sb = getSupabaseBrowserClient()
  channel = sb.channel('online', { config: { presence: { key: userId } } })
  channel
    .on('presence', { event: 'sync' }, () => {
      online = new Set(Object.keys(channel.presenceState() as Record<string, unknown>))
      emit()
    })
    .subscribe((status: string) => {
      if (status === 'SUBSCRIBED') channel.track({ at: Date.now() })
    })
}

export function stopPresence(): void {
  if (channel) {
    try {
      getSupabaseBrowserClient().removeChannel(channel)
    } catch {
      /* noop */
    }
    channel = null
  }
  currentUserId = null
  online = EMPTY
  emit()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
function getSnapshot(): ReadonlySet<string> {
  return online
}

// Ensemble des ids en ligne (réactif).
export function useOnlineUsers(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
}
