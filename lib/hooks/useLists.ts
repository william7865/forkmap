'use client'

import { useState, useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/api'

export interface ListRow {
  id: string
  user_id: string
  name: string
  description: string | null
  is_public: boolean
  color_hue: number
  created_at: string
  updated_at: string
  item_count: number
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const sb = getSupabaseBrowserClient()
    const {
      data: { session },
    } = await sb.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  } catch {
    return {}
  }
}

export function useLists() {
  const [lists, setLists] = useState<ListRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLists = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const res = await apiFetch('/api/lists', { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setLists(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  const createList = useCallback(
    async (name: string, description: string | null, isPublic: boolean): Promise<ListRow> => {
      const headers = await getAuthHeaders()
      const res = await apiFetch('/api/lists', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, is_public: isPublic }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const created: ListRow = { ...json.data, item_count: 0 }
      setLists((prev) => [created, ...prev])
      return created
    },
    []
  )

  const updateList = useCallback(
    async (
      id: string,
      patch: { name?: string; description?: string | null; is_public?: boolean }
    ): Promise<void> => {
      const headers = await getAuthHeaders()
      const res = await apiFetch(`/api/lists/${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...json.data } : l)))
    },
    []
  )

  const deleteList = useCallback(async (id: string): Promise<void> => {
    const headers = await getAuthHeaders()
    const res = await apiFetch(`/api/lists/${id}`, { method: 'DELETE', headers })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    setLists((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const addItemToList = useCallback(
    async (
      listId: string,
      osmId: string,
      placeSnapshot: Record<string, unknown>
    ): Promise<void> => {
      const headers = await getAuthHeaders()
      const res = await apiFetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ osm_id: osmId, place_snapshot: placeSnapshot }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, item_count: l.item_count + 1 } : l))
      )
    },
    []
  )

  const removeItemFromList = useCallback(async (listId: string, osmId: string): Promise<void> => {
    const headers = await getAuthHeaders()
    const res = await apiFetch(`/api/lists/${listId}/items/${encodeURIComponent(osmId)}`, {
      method: 'DELETE',
      headers,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, item_count: Math.max(0, l.item_count - 1) } : l))
    )
  }, [])

  const getListsForPlace = useCallback(async (osmId: string): Promise<string[]> => {
    const headers = await getAuthHeaders()
    const res = await apiFetch(`/api/lists/for-place?osm_id=${encodeURIComponent(osmId)}`, {
      headers,
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  }, [])

  return {
    lists,
    loading,
    fetchLists,
    createList,
    updateList,
    deleteList,
    addItemToList,
    removeItemFromList,
    getListsForPlace,
  }
}
