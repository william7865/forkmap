'use client'
// Unread notifications counter (bell badge). Mirrors the useUnreadMessages
// pattern; previously an ad-hoc fetch inside the Découvrir screen.
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'

export function useUnreadNotifications(): {
  unread: number
  /** Optimistically zero the badge (call when the notifications sheet opens). */
  markSeen: () => void
} {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    let alive = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/notifications', { headers: await getAuthHeaders() })
        if (!alive || !res.ok) return
        const list = ((await res.json()).data ?? []) as { read_at: string | null }[]
        setUnread(list.filter((n) => !n.read_at).length)
      } catch {
        /* noop */
      }
    })()
    return () => {
      alive = false
    }
  }, [userId])

  return { unread, markSeen: () => setUnread(0) }
}
