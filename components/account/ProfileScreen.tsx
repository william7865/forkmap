// ============================================================
// components/account/ProfileScreen.tsx
// Native profile screen (iOS/Android via Capacitor).
// Clean Instagram/BeReal-style: avatar, name, @pseudo,
// key stats, favorites preview. Web /account stays unchanged.
// ============================================================
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Star, Bookmark } from 'lucide-react'
import { useAuthGuard } from '@/lib/hooks/useAuthGuard'
import PlaceThumb from '@/components/place/PlaceThumb'
import { frCuisine } from '@/lib/cuisine'
import { useProfile } from '@/lib/hooks/useProfile'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { Avatar } from '@/components/social/Avatar'
import ProfileEdit from '@/components/social/ProfileEdit'
import ShareProfileSheet from '@/components/social/ShareProfileSheet'
import type { FavoriteRow, PlaceCard } from '@/types'

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
              padding: '30px 24px 36px',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: 'var(--surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-3)',
              }}
            >
              <Bookmark size={26} strokeWidth={1.6} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--text)',
                  letterSpacing: '-0.01em',
                }}
              >
                Rien d&apos;enregistré… pour l&apos;instant
              </div>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 13.5,
                  color: 'var(--text-2)',
                  lineHeight: 1.5,
                }}
              >
                Enregistre les restaurants qui te font envie&nbsp;: ils apparaîtront ici.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                padding: '11px 20px',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Explorer la carte
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {previewFavs.map((f) => {
              const place: PlaceCard =
                f.snapshot ??
                ({
                  osm_id: f.osm_id,
                  osm_type: 'node',
                  name: f.name,
                  lat: 0,
                  lon: 0,
                  tags: {},
                } as PlaceCard)
              const rating = f.snapshot?.fsq?.rating
              const cuisine = f.snapshot?.cuisine ?? f.snapshot?.fsq?.categories?.[0]?.name
              return (
                <button
                  key={f.id}
                  onClick={() => router.push('/favorites')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    background: 'var(--white)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)',
                    padding: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      overflow: 'hidden',
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    <PlaceThumb place={place} initialSize={24} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'var(--text)',
                        letterSpacing: '-0.01em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.snapshot?.name ?? f.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 3,
                        fontSize: 12.5,
                        color: 'var(--text-2)',
                      }}
                    >
                      {rating != null && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontWeight: 700,
                            color: 'var(--text)',
                          }}
                        >
                          <Star size={12} strokeWidth={0} fill="var(--star)" />
                          {rating.toFixed(1)}
                        </span>
                      )}
                      {cuisine && (
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {frCuisine(cuisine)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
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
