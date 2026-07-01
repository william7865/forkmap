'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import type { MessageRow } from '@/types'

async function authHeaders(): Promise<Record<string, string>> {
  const sb = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await sb.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export function useChatThread(otherUserId: string, myUserId: string) {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const seen = useRef<Set<string>>(new Set())

  const append = useCallback((m: MessageRow) => {
    if (seen.current.has(m.id)) return
    seen.current.add(m.id)
    setMessages((prev) => [...prev, m])
  }, [])

  // Chargement initial + marquer lu.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const headers = await authHeaders()
        const res = await apiFetch(`/api/messages/${otherUserId}`, { headers })
        if (!alive) return
        if (res.ok) {
          const rows = ((await res.json()).data ?? []) as MessageRow[]
          seen.current = new Set(rows.map((r) => r.id))
          setMessages(rows)
        }
        // fire-and-forget: marquer lu
        apiFetch(`/api/messages/${otherUserId}`, { method: 'PATCH', headers }).catch(() => {})
      } catch {
        /* garder l'état */
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [otherUserId])

  // Abonnement Realtime : messages entrants d'otherUserId.
  useEffect(() => {
    const sb = getSupabaseBrowserClient()
    const ch = sb
      .channel(`msg:${myUserId}:${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${myUserId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow
          if (row.sender_id === otherUserId) append(row)
        }
      )
      .subscribe()
    return () => {
      sb.removeChannel(ch)
    }
  }, [myUserId, otherUserId, append])

  const send = useCallback(
    async (content: string) => {
      const text = content.trim()
      if (!text || sending) return
      setSending(true)
      try {
        const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
        const res = await apiFetch('/api/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({ toUserId: otherUserId, content: text }),
        })
        if (res.ok) {
          const msg = (await res.json()).data as MessageRow
          append(msg) // écho de MON message (le filtre Realtime ne me le renvoie pas)
        }
      } catch {
        /* noop */
      } finally {
        setSending(false)
      }
    },
    [otherUserId, sending, append]
  )

  return { messages, loading, send, sending }
}
