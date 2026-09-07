'use client'
// Compteur global de messages non lus (badges tab bar + Découvrir).
// Store de module partagé : UNE souscription realtime + UN poller quel que
// soit le nombre de composants abonnés. Deux montages simultanés du hook
// créaient sinon le même topic `unread:<id>` — supabase-js réutilise alors le
// channel déjà souscrit et refuse le `.on()` (« cannot add postgres_changes
// callbacks after subscribe() »). Même pattern singleton que lib/presence.ts.
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { useAuth } from '@/lib/hooks/useAuth'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import type { ConversationSummary } from '@/types'

type Listener = (n: number) => void
const listeners = new Set<Listener>()
let count = 0
let currentUserId = ''
let stop: (() => void) | null = null

function emit(n: number) {
  count = n
  listeners.forEach((l) => l(n))
}

function start(myId: string): () => void {
  let alive = true
  let timer: ReturnType<typeof setTimeout> | null = null

  const refresh = async () => {
    try {
      const res = await apiFetch('/api/conversations', { headers: await getAuthHeaders() })
      if (!alive || !res.ok) return
      const convos = ((await res.json()).data ?? []) as ConversationSummary[]
      emit(convos.reduce((n, c) => n + (c.unread ?? 0), 0))
    } catch {
      /* garder l'état */
    }
  }

  // Débounce léger pour regrouper les rafales d'événements realtime.
  const scheduleRefresh = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(refresh, 400)
  }

  refresh()

  // Realtime : un message entrant → recompter.
  const sb = getSupabaseBrowserClient()
  const ch = sb
    .channel(`unread:${myId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${myId}` },
      scheduleRefresh
    )
    .subscribe()

  // Refetch au retour dans l'app + filet de sécurité périodique.
  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh()
  }
  document.addEventListener('visibilitychange', onVisible)
  const poll = setInterval(refresh, 20000)

  return () => {
    alive = false
    if (timer) clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisible)
    clearInterval(poll)
    sb.removeChannel(ch)
  }
}

// La souscription suit l'utilisateur, pas les composants : démarrée au premier
// abonné, elle n'est arrêtée qu'au changement de compte (déconnexion comprise)
// — la tab bar, toujours montée en natif, garde le badge frais de toute façon.
function ensure(myId: string) {
  if (myId === currentUserId) return
  stop?.()
  stop = null
  currentUserId = myId
  if (myId) stop = start(myId)
  else emit(0)
}

export function useUnreadMessages(): number {
  const auth = useAuth()
  const myId = auth.user?.id ?? ''
  const [n, setN] = useState(count)

  useEffect(() => {
    listeners.add(setN)
    setN(count)
    ensure(myId)
    return () => {
      listeners.delete(setN)
    }
  }, [myId])

  return n
}
