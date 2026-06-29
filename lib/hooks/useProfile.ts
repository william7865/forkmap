'use client'
import { useCallback, useEffect, useState } from 'react'
import type { Profile } from '@/types'
import { apiFetch } from '@/lib/api'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { resizeImage } from '@/lib/images'
import { pickAvatarPhoto } from '@/lib/native/camera'

async function authHeaders(): Promise<Record<string, string>> {
  const sb = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await sb.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false) // initial load done

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/profile', { headers: await authHeaders() })
      setProfile(res.ok ? (await res.json()).data : null)
    } catch {
      setProfile(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
        setProfile(json.data)
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
        setProfile(json.data)
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
    if (!raw) return null
    const blob = await resizeImage(raw, 512)
    const sb = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return null
    const path = `${user.id}/avatar.jpg`
    const { error } = await sb.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) return null
    const { data } = sb.storage.from('avatars').getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}` // cache-bust
  }, [])

  return {
    profile,
    ready,
    createProfile,
    updateProfile,
    checkUsername,
    pickAndUploadAvatar,
    reload: load,
  }
}
