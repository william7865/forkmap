'use client'
// useSocialProof — annotates a list of places with the friends who saved/
// visited them (social proof avatars on cards). Fetches a single batch request
// keyed on the visible osm_ids; no-op when logged out (graceful).
import { useEffect, useMemo, useState } from 'react'
import type { PlaceCard, FriendLite } from '@/types'
import { apiFetch } from '@/lib/api'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'

const MAX_IDS = 80

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const {
      data: { session },
    } = await getSupabaseBrowserClient().auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  } catch {
    return {}
  }
}

export function useSocialProof(places: PlaceCard[]): PlaceCard[] {
  const [proof, setProof] = useState<Record<string, FriendLite[]>>({})

  // Stable key: the (capped, sorted) set of visible ids. Changes when the map
  // moves to a new area, not on each enrichment batch.
  const ids = useMemo(() => places.slice(0, MAX_IDS).map((p) => p.osm_id), [places])
  const idsKey = useMemo(() => [...ids].sort().join(','), [ids])

  // Debounce the fetch trigger: filtering the search box changes the visible id
  // set on every keystroke, which would otherwise fire an authenticated
  // /social-batch POST per character. Coalesce to ~300ms of stability.
  const [debouncedKey, setDebouncedKey] = useState(idsKey)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKey(idsKey), 300)
    return () => clearTimeout(t)
  }, [idsKey])

  useEffect(() => {
    if (!ids.length) {
      setProof({})
      return
    }
    let cancelled = false
    authHeaders().then((headers) => {
      if (cancelled || !headers.Authorization) return
      apiFetch('/api/places/social-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ osm_ids: ids }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { data?: Record<string, FriendLite[]> } | null) => {
          if (!cancelled && d?.data) setProof(d.data)
        })
        .catch(() => {})
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKey])

  return useMemo(() => {
    if (Object.keys(proof).length === 0) return places
    return places.map((p) => {
      const f = proof[p.osm_id]
      return f && f.length ? { ...p, friendsSaved: f } : p
    })
  }, [places, proof])
}
