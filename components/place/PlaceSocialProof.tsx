'use client'
// PlaceSocialProof — "friends who saved / visited this" row on the place
// detail. Fetches /api/places/social; renders nothing when logged out or when
// no friend has any activity here (so it never shows an empty shell).
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { useIsNative } from '@/lib/native/platform'
import { Avatar } from '@/components/social/Avatar'
import { staggerDelay } from '@/lib/motion'

interface FriendLite {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

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

/** First name only, for a compact sentence. */
function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName
}

/** "Léa" · "Léa et Karim" · "Léa, Karim +2" */
function nameList(people: FriendLite[]): string {
  const names = people.map((p) => firstName(p.display_name))
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} et ${names[1]}`
  return `${names[0]}, ${names[1]} +${names.length - 2}`
}

export default function PlaceSocialProof({ osmId }: { osmId: string }) {
  const native = useIsNative()
  const [saved, setSaved] = useState<FriendLite[]>([])
  const [visited, setVisited] = useState<FriendLite[]>([])

  useEffect(() => {
    // Social is app-only — never fetch/show on web (keeps web rendering frozen).
    if (!native) return
    let cancelled = false
    setSaved([])
    setVisited([])
    authHeaders().then((h) => {
      if (cancelled || !h.Authorization) return
      apiFetch(`/api/places/social?osm_id=${encodeURIComponent(osmId)}`, { headers: h })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { data?: { saved: FriendLite[]; visited: FriendLite[] } } | null) => {
          if (cancelled || !d?.data) return
          setSaved(d.data.saved ?? [])
          setVisited(d.data.visited ?? [])
        })
        .catch(() => {})
    })
    return () => {
      cancelled = true
    }
  }, [osmId, native])

  // Avatar stack = union (saved first), max 3 shown.
  const union = [...saved, ...visited.filter((v) => !saved.some((s) => s.id === v.id))]
  if (union.length === 0) return null

  const parts: string[] = []
  if (saved.length)
    parts.push(`${nameList(saved)} ${saved.length > 1 ? "l'ont" : "l'a"} enregistré`)
  if (visited.length)
    parts.push(`${nameList(visited)} ${visited.length > 1 ? "l'ont" : "l'a"} visité`)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '11px 13px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
      }}
    >
      <div style={{ display: 'flex', flexShrink: 0 }}>
        {union.slice(0, 3).map((p, i) => (
          <div
            key={p.id}
            // The faces gather one after the other rather than blinking in as a
            // block — the one place on the fiche where the data IS people.
            className="anim-scale-in"
            style={{
              marginLeft: i === 0 ? 0 : -9,
              borderRadius: '50%',
              boxShadow: '0 0 0 2px var(--surface)',
              animationDelay: staggerDelay(i, 70),
            }}
          >
            <Avatar name={p.display_name} src={p.avatar_url} id={p.id} size={30} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.35 }}>
        {parts.map((t, i) => {
          // Bold the names (before the first apostrophe group) for scannability.
          const idx = t.indexOf(" l'")
          const names = idx > 0 ? t.slice(0, idx) : t
          const rest = idx > 0 ? t.slice(idx) : ''
          return (
            <span key={i}>
              {i > 0 && <span style={{ opacity: 0.5 }}> · </span>}
              <b style={{ color: 'var(--text)', fontWeight: 700 }}>{names}</b>
              {rest}
            </span>
          )
        })}
      </div>
    </div>
  )
}
