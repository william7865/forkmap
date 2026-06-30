'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import FriendButton from '@/components/social/FriendButton'
import { useIsNative } from '@/lib/native/platform'
import { apiFetch } from '@/lib/api'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { placeGradient } from '@/lib/gradients'
import type { PublicProfileBundle } from '@/types'

async function authHeaders(): Promise<Record<string, string>> {
  const sb = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await sb.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export default function PublicProfilePageClient() {
  const native = useIsNative()
  const router = useRouter()
  const params = useParams<{ username: string }>()
  const username = params?.username ?? ''
  const [bundle, setBundle] = useState<PublicProfileBundle | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiFetch(`/api/users/${encodeURIComponent(username)}/profile`, {
          headers: await authHeaders(),
        })
        if (!alive) return
        if (res.status === 404) {
          setState('notfound')
          return
        }
        if (!res.ok) {
          setState('notfound')
          return
        }
        setBundle(((await res.json()).data as PublicProfileBundle) ?? null)
        setState('ready')
      } catch {
        if (alive) setState('notfound')
      }
    })()
    return () => {
      alive = false
    }
  }, [username])

  if (!native) return <Centered>Disponible dans l&apos;application Forkmap.</Centered>
  if (state === 'loading') return <Centered>Chargement…</Centered>
  if (state === 'notfound' || !bundle) return <Centered>Profil introuvable.</Centered>

  const p = bundle.profile
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        paddingBottom: 'calc(var(--safe-bottom) + 80px)',
      }}
    >
      {/* Top bar */}
      <div style={{ padding: 'calc(var(--safe-top) + 10px) 16px 0', display: 'flex' }}>
        <button
          onClick={() => router.back()}
          aria-label="Retour"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ink)',
            padding: 0,
          }}
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Identity */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '8px 20px 0',
        }}
      >
        <Avatar name={p.display_name} src={p.avatar_url} id={p.id} size={96} />
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          {p.display_name}
        </h1>
        <span style={{ fontSize: 14, color: 'var(--text-3)' }}>@{p.username}</span>
        <div style={{ marginTop: 8 }}>
          <FriendButton userId={p.id} status={bundle.status} />
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          margin: '24px 16px 0',
          padding: '16px 8px',
          background: 'var(--white)',
          border: '1px solid var(--b2)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--s2)',
        }}
      >
        <Stat n={bundle.friends_count} label="Amis" />
        <Stat n={bundle.stats.lists} label="Listes" border />
        <Stat n={bundle.stats.places} label="Lieux" border />
        <Stat n={bundle.stats.cuisines} label="Cuisines" border />
      </div>

      {/* Public lists */}
      <div style={{ margin: '28px 16px 0' }}>
        <p
          style={{
            margin: '0 0 8px 4px',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: 'var(--text-2)',
          }}
        >
          Listes publiques
        </p>
        {bundle.lists.length === 0 ? (
          <p style={{ margin: '4px', fontSize: 13.5, color: 'var(--text-3)' }}>
            Aucune liste publique.
          </p>
        ) : (
          bundle.lists.map((l) => (
            <div
              key={l.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                marginBottom: 8,
                background: 'var(--white)',
                border: '1px solid var(--b2)',
                borderRadius: 'var(--r-md)',
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--r-md)',
                  background: placeGradient(l.id),
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 15,
                    color: 'var(--ink)',
                  }}
                >
                  {l.name}
                </strong>
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {l.item_count} lieu{l.item_count > 1 ? 'x' : ''}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function Stat({ n, label, border }: { n: number; label: string; border?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderLeft: border ? '1px solid var(--b1)' : 'none',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 22,
          color: 'var(--ink)',
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</span>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-2)',
        padding: 24,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
}
