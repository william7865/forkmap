// ============================================================
// components/account/ProfileScreen.tsx
// Native profile screen (iOS/Android via Capacitor).
// Clean Instagram/BeReal-style: avatar, name, @pseudo,
// key stats, favorites preview. Web /account stays unchanged.
// ============================================================
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'
import { useAuthGuard } from '@/lib/hooks/useAuthGuard'
import { useProfile } from '@/lib/hooks/useProfile'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { Avatar } from '@/components/social/Avatar'
import ProfileEdit from '@/components/social/ProfileEdit'
import ShareProfileSheet from '@/components/social/ShareProfileSheet'
import type { FavoriteRow } from '@/types'

// ── Local types ───────────────────────────────────────────────
interface VisitStats {
  total_visits: number
  total_spent: number
}

// ── Auth helpers ──────────────────────────────────────────────
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

// ── Spinner ───────────────────────────────────────────────────
function Spinner() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '2px solid var(--b2)',
          borderTop: '2px solid var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function ProfileScreen() {
  const { isReady } = useAuthGuard()
  const { profile } = useProfile()
  const router = useRouter()

  const [favorites, setFavorites] = useState<FavoriteRow[]>([])
  const [stats, setStats] = useState<VisitStats | null>(null)
  const [editing, setEditing] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    async function loadData() {
      const h = await getAuthHeaders()
      try {
        const r = await apiFetch('/api/favorites', { headers: h })
        if (r.ok) {
          const d = await r.json()
          setFavorites(d.data ?? [])
        }
      } catch {
        // fail silently — favorites stay []
      }
      try {
        const r = await apiFetch('/api/visits/stats', { headers: h })
        if (r.ok) {
          const d = await r.json()
          setStats(d.data ?? null)
        }
      } catch {
        // fail silently — stats stay null
      }
    }
    loadData()
  }, [])

  if (!isReady) return <Spinner />

  const cuisines = [...new Set(favorites.map((f) => f.snapshot?.cuisine).filter(Boolean))]

  const previewFavs = favorites.slice(0, 4)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        paddingBottom: 'calc(var(--safe-bottom) + 80px)',
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          padding: 'calc(var(--safe-top) + 10px) 16px 0',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={() => router.push('/settings')}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'var(--white)',
            border: '1px solid var(--b2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
          aria-label="Paramètres"
        >
          <Settings size={22} color="var(--text-2)" />
        </button>
      </div>

      {/* IDENTITY */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '8px 20px 0',
        }}
      >
        <Avatar
          name={profile?.display_name ?? 'Mon profil'}
          src={profile?.avatar_url}
          id={profile?.id ?? 'me'}
          size={96}
        />

        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          {profile?.display_name ?? 'Mon profil'}
        </p>

        {profile?.username && (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'var(--text-3)',
            }}
          >
            @{profile.username}
          </p>
        )}
        {profile?.bio && (
          <p
            style={{
              margin: '6px 0 0',
              maxWidth: 320,
              textAlign: 'center',
              fontSize: 14,
              lineHeight: 1.4,
              color: 'var(--text-2)',
            }}
          >
            {profile.bio}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button
            className="btn-secondary"
            style={{ width: 'auto' }}
            onClick={() => setEditing(true)}
          >
            Modifier le profil
          </button>
          {profile?.username && (
            <button
              className="btn-secondary"
              style={{ width: 'auto' }}
              onClick={() => setSharing(true)}
            >
              Partager mon profil
            </button>
          )}
        </div>
      </div>

      {/* STATS ROW */}
      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--b2)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--s2)',
          margin: '24px 16px 0',
          padding: '16px 8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
        }}
      >
        {(
          [
            { value: String(stats?.total_visits ?? 0), label: 'Visites', first: true },
            { value: String(favorites.length), label: 'Favoris', first: false },
            {
              value: `${stats?.total_spent ? Math.round(stats.total_spent) : 0} €`,
              label: 'Dépensé',
              first: false,
            },
            { value: String(cuisines.length), label: 'Cuisines', first: false },
          ] as { value: string; label: string; first: boolean }[]
        ).map(({ value, label, first }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderLeft: first ? undefined : '1px solid var(--b1)',
              padding: '0 4px',
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
              {value}
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                marginTop: 2,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* MES FAVORIS */}
      <div style={{ margin: '28px 16px 0' }}>
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-2)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Mes favoris
          </span>
          {favorites.length > 0 && (
            <button
              onClick={() => router.push('/favorites')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 13,
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Tout voir
            </button>
          )}
        </div>

        {/* Favorites list */}
        {favorites.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px 0',
              gap: 12,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: 'var(--text-3)',
                textAlign: 'center',
              }}
            >
              Aucun favori pour l&apos;instant.
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 13,
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Découvrir des restaurants
            </button>
          </div>
        ) : (
          previewFavs.map((f) => (
            <div
              key={f.id}
              style={{
                background: 'var(--white)',
                border: '1px solid var(--b2)',
                borderRadius: 'var(--r-md)',
                padding: '12px 14px',
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  color: 'var(--ink)',
                }}
              >
                {f.snapshot?.name ?? f.name}
              </span>
              {f.snapshot?.cuisine && (
                <span
                  style={{
                    fontSize: 12.5,
                    color: 'var(--text-3)',
                    marginTop: 2,
                  }}
                >
                  {f.snapshot.cuisine}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Profile edit modal */}
      {editing && <ProfileEdit onClose={() => setEditing(false)} />}

      {/* Share profile sheet */}
      {sharing && profile?.username && (
        <ShareProfileSheet username={profile.username} onClose={() => setSharing(false)} />
      )}
    </div>
  )
}
