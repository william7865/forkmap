'use client'
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import type { Profile } from '@/types'
import { apiFetch } from '@/lib/api'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { resizeImage } from '@/lib/images'
import { pickAvatarPhoto } from '@/lib/native/camera'

// ── Shared store ──────────────────────────────────────────────
// One profile state for ALL consumers (friends header, edit, onboarding) so an
// edit in one place is reflected everywhere, and the edit screen sees the
// already-loaded profile (pre-filled fields) instead of re-loading its own copy.
interface State {
  profile: Profile | null
  ready: boolean
}
let state: State = { profile: null, ready: false }
const listeners = new Set<() => void>()

function setState(next: Partial<State>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
function getSnapshot() {
  return state
}
const SERVER_SNAPSHOT: State = { profile: null, ready: false }

async function authHeaders(): Promise<Record<string, string>> {
  const sb = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await sb.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

let loading = false
async function loadProfile() {
  if (loading) return
  loading = true
  try {
    const res = await apiFetch('/api/profile', { headers: await authHeaders() })
    setState({ profile: res.ok ? (await res.json()).data : null, ready: true })
  } catch {
    setState({ profile: null, ready: true })
  } finally {
    loading = false
  }
}

// Re-sync once on any auth change (login/logout) — module-level so it's wired once.
let authWired = false
function wireAuthSync() {
  if (authWired) return
  authWired = true
  const sb = getSupabaseBrowserClient()
  sb.auth.onAuthStateChange(() => {
    loadProfile()
  })
}

export function useProfile() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT)

  useEffect(() => {
    wireAuthSync()
    if (!state.ready) loadProfile()
  }, [])

  const checkUsername = useCallback(async (u: string) => {
    const res = await apiFetch(`/api/profile/check-username?u=${encodeURIComponent(u)}`, {
      headers: await authHeaders(),
    })
    return (await res.json()) as { available: boolean; reason?: string }
  }, [])

  const createProfile = useCallback(
    async (input: { username: string; display_name: string; avatar_url: string | null }) => {
      const res = await apiFetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(input),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setState({ profile: json.data, ready: true })
        return { ok: true as const }
      }
      return { ok: false as const, error: json.error as string }
    },
    []
  )

  const updateProfile = useCallback(
    async (patch: { display_name?: string; avatar_url?: string | null; username?: string }) => {
      const res = await apiFetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(patch),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setState({ profile: json.data })
        return { ok: true as const }
      }
      return {
        ok: false as const,
        error: json.error as string,
        nextChangeAt: json.nextChangeAt as string | undefined,
      }
    },
    []
  )

  const pickAndUploadAvatar = useCallback(async (): Promise<string | null> => {
    const raw = await pickAvatarPhoto()
    if (!raw) return null // user cancelled
    const blob = await resizeImage(raw, 512)
    const sb = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) throw new Error('not_authenticated')
    const path = `${user.id}/avatar.jpg`
    const { error } = await sb.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) throw new Error(error.message)
    const { data } = sb.storage.from('avatars').getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}` // cache-bust
  }, [])

  return {
    profile: snap.profile,
    ready: snap.ready,
    createProfile,
    updateProfile,
    checkUsername,
    pickAndUploadAvatar,
    reload: loadProfile,
  }
}
