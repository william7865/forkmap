'use client'
// Compteur global de messages non lus (badge onglet Social).
// Données existantes : /api/conversations renvoie déjà `unread` par conversation.
import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { useAuth } from '@/lib/hooks/useAuth'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import type { ConversationSummary } from '@/types'

export function useUnreadMessages(): number {
  const auth = useAuth()
  const myId = auth.user?.id ?? ''
  const [count, setCount] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!myId) {
      setCount(0)
      return
    }
    let alive = true

    const refresh = async () => {
      try {
        const res = await apiFetch('/api/conversations', { headers: await getAuthHeaders() })
        if (!alive || !res.ok) return
        const convos = ((await res.json()).data ?? []) as ConversationSummary[]
        setCount(convos.reduce((n, c) => n + (c.unread ?? 0), 0))
      } catch {
        /* garder l'état */
      }
    }

    // Débounce léger pour regrouper les rafales d'événements realtime.
    const scheduleRefresh = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(refresh, 400)
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
      if (timer.current) clearTimeout(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(poll)
      sb.removeChannel(ch)
    }
  }, [myId])

  return count
}
