'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { getAuthHeaders } from '@/lib/auth-headers'
import type { MessageRow } from '@/types'

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
        const headers = await getAuthHeaders()
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
    if (!myUserId) return // pas d'abonnement tant que l'auth n'est pas résolue
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

  // Renvoie true si le message a bien été envoyé, false sinon (pour que l'UI
  // restaure le texte + prévienne au lieu d'un échec silencieux).
  const send = useCallback(
    async (content: string): Promise<boolean> => {
      const text = content.trim()
      if (!text || sending) return false
      setSending(true)
      try {
        const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
        const res = await apiFetch('/api/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({ toUserId: otherUserId, content: text }),
        })
        if (!res.ok) return false
        const msg = (await res.json()).data as MessageRow
        append(msg) // écho de MON message (le filtre Realtime ne me le renvoie pas)
        return true
      } catch {
        return false
      } finally {
        setSending(false)
      }
    },
    [otherUserId, sending, append]
  )

  // Éditer un de mes messages.
  const editMsg = useCallback(async (id: string, content: string): Promise<boolean> => {
    const text = content.trim()
    if (!text) return false
    try {
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
      const res = await apiFetch(`/api/messages/item/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ content: text }),
      })
      if (!res.ok) return false
      const updated = (await res.json()).data as MessageRow
      setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)))
      return true
    } catch {
      return false
    }
  }, [])

  // Supprimer un de mes messages (suppression douce).
  const removeMsg = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/messages/item/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      })
      if (!res.ok) return false
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, deleted_at: new Date().toISOString(), content: '', payload: null }
            : m
        )
      )
      return true
    } catch {
      return false
    }
  }, [])

  return { messages, loading, send, sending, editMsg, removeMsg }
}
