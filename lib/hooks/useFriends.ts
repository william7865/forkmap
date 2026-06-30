'use client'
import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import type { Profile, FriendRequests, UserSearchResult } from '@/types'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const sb = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await sb.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export function useFriends() {
  const [friends, setFriends] = useState<Profile[]>([])
  const [requests, setRequests] = useState<FriendRequests>({ received: [], sent: [] })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const [fRes, rRes] = await Promise.all([
        apiFetch('/api/friends', { headers }),
        apiFetch('/api/friends/requests', { headers }),
      ])
      if (fRes.ok) setFriends(((await fRes.json()).data as Profile[]) ?? [])
      if (rRes.ok)
        setRequests(((await rRes.json()).data as FriendRequests) ?? { received: [], sent: [] })
    } catch {
      // network — keep previous state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const search = useCallback(async (q: string): Promise<UserSearchResult[]> => {
    if (q.trim().length < 2) return []
    const headers = await getAuthHeaders()
    const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`, { headers })
    if (!res.ok) return []
    return ((await res.json()).data as UserSearchResult[]) ?? []
  }, [])

  const sendRequest = useCallback(
    async (userId: string) => {
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
      await apiFetch('/api/friends', { method: 'POST', headers, body: JSON.stringify({ userId }) })
      await reload()
    },
    [reload]
  )

  const accept = useCallback(
    async (userId: string) => {
      const headers = await getAuthHeaders()
      await apiFetch(`/api/friends/${userId}/accept`, { method: 'POST', headers })
      await reload()
    },
    [reload]
  )

  const decline = useCallback(
    async (userId: string) => {
      const headers = await getAuthHeaders()
      await apiFetch(`/api/friends/${userId}`, { method: 'DELETE', headers })
      await reload()
    },
    [reload]
  )

  const removeFriend = decline

  return { friends, requests, loading, reload, search, sendRequest, accept, decline, removeFriend }
}
