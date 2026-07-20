// ============================================================
// components/account/ProfileScreen.tsx
// Native profile screen (iOS/Android via Capacitor).
// Layout « bibliothèque » (palette Forkmap conservée) :
// grand titre serif + avatar, puis des sections calmes et aérées
// séparées par des filets fins — chiffres, listes-collections,
// lignes-favoris, réglages en lignes avec chevrons.
// Web /account stays unchanged (rendered by AccountPage).
// ============================================================
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Star, Bookmark, Share2 } from 'lucide-react'
import { useAuthGuard } from '@/lib/hooks/useAuthGuard'
import { placeGradient } from '@/lib/gradients'
import { placeInitial, placePhotoUrl } from '@/components/place/PlaceThumb'
import { frCuisine } from '@/lib/cuisine'
import { useProfile } from '@/lib/hooks/useProfile'
import { useLists, type ListRow } from '@/lib/hooks/useLists'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { Avatar } from '@/components/social/Avatar'
import { ListCard } from '@/components/lists/ListCard'
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

// ── Snapshot photo (plain <img>, jamais next/image) ───────────
// A snapshot stores whatever URL the client held when the place was saved.
// The proxy already serves a sized image; on error we fall back to the
// gradient + serif initial, exactly like PlaceThumb everywhere else.
function favPhoto(fav: FavoriteRow, w = 200): string | null {
  return fav.snapshot ? placePhotoUrl(fav.snapshot as unknown as PlaceCard, w) : null
}

function FavThumbImg({ src }: { src: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
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
    </div>
  )
}

// ── Petites briques éditoriales (façon Favoris) ────────
const MetaDot = () => (
  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-4)' }} />
)

// En-tête de section serif — « Mes listes », « Mes favoris »…
function SecHead({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 13,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 21,
          letterSpacing: '-0.01em',
          color: 'var(--text)',
        }}
      >
        {title}
      </h2>
      {action && (
        <button
          type="button"
          onClick={onAction}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-3)',
          }}
        >
          {action}
        </button>
      )}
    </div>
  )
}

// Section calme séparée par un filet fin
const sectionStyle: React.CSSProperties = {
  marginTop: 28,
  paddingTop: 28,
  borderTop: '1px solid var(--border)',
}

// Ligne-favori « bibliothèque » (vignette 66 + nom serif + méta)
function FavRow({ fav, onOpen }: { fav: FavoriteRow; onOpen: () => void }) {
  const cuisine = fav.snapshot?.cuisine ?? fav.snapshot?.fsq?.categories?.[0]?.name
  const rating = fav.snapshot?.fsq?.rating
  const openNow = fav.snapshot?.open_now
  const photo = favPhoto(fav)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Voir ${fav.name}`}
      className="tap-press"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        width: '100%',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      {/* Vignette — photo ou repli dégradé + initiale serif */}
      <span
        style={{
          position: 'relative',
          width: 66,
          height: 66,
          borderRadius: 15,
          overflow: 'hidden',
          flexShrink: 0,
          background: placeGradient(fav.osm_id),
          boxShadow: 'var(--s1)',
        }}
      >
        {photo ? (
          <FavThumbImg src={photo} />
        ) : (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            {placeInitial(fav.snapshot?.name ?? fav.name)}
          </span>
        )}
      </span>

      {/* Corps — nom serif + méta */}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-display)',
            fontSize: 16.5,
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fav.snapshot?.name ?? fav.name}
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            marginTop: 5,
            flexWrap: 'wrap',
          }}
        >
          {rating != null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              <Star size={11} strokeWidth={0} fill="var(--star)" />
              {rating.toFixed(1)}
            </span>
          )}
          {cuisine && (
            <>
              {rating != null && <MetaDot />}
              <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{frCuisine(cuisine)}</span>
            </>
          )}
          {openNow != null && (
            <>
              {(rating != null || cuisine) && <MetaDot />}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: openNow ? 'var(--open)' : 'var(--closed)',
                }}
              >
                <span
                  style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}
                />
                {openNow ? 'Ouvert' : 'Fermé'}
              </span>
            </>
          )}
        </span>
      </span>
    </button>
  )
}

// Bouton-icône rond (barre du haut : partager, réglages) —
const iconBtnStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: '50%',
  flexShrink: 0,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-2)',
  cursor: 'pointer',
}

// ── Main component ────────────────────────────────────────────
export default function ProfileScreen() {
  const { isReady } = useAuthGuard()
  const { profile } = useProfile()
  const { lists, fetchLists } = useLists()
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
    fetchLists()
  }, [fetchLists])

  if (!isReady) return <Spinner />

  const displayName = profile?.display_name ?? 'Mon profil'
  const cuisines = [...new Set(favorites.map((f) => f.snapshot?.cuisine).filter(Boolean))]
  const previewFavs = favorites.slice(0, 4)
  const previewLists = lists.slice(0, 4)

  const figures: { value: string; label: string }[] = [
    { value: String(stats?.total_visits ?? 0), label: 'Visites' },
    { value: String(favorites.length), label: 'Favoris' },
    { value: `${stats?.total_spent ? Math.round(stats.total_spent) : 0} €`, label: 'Dépensé' },
    { value: String(cuisines.length), label: 'Cuisines' },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          maxWidth: 660,
          margin: '0 auto',
          padding: 'calc(var(--safe-top) + 16px) 20px calc(var(--safe-bottom) + 88px)',
        }}
      >
        {/* ── Barre d'icônes en haut à droite (partager + réglages), ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 4 }}>
          {profile?.username && (
            <button
              type="button"
              onClick={() => setSharing(true)}
              aria-label="Partager mon profil"
              style={iconBtnStyle}
            >
              <Share2 size={19} strokeWidth={1.8} />
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/settings')}
            aria-label="Paramètres"
            style={iconBtnStyle}
          >
            <Settings size={19} strokeWidth={1.8} />
          </button>
        </div>

        {/* ── Masthead : avatar puis grand titre serif (pile, éditorial) ── */}
        <header style={{ animation: 'fadeUp 280ms var(--ease-out) both' }}>
          <Avatar name={displayName} src={profile?.avatar_url} id={profile?.id ?? 'me'} size={72} />
          <h1
            style={{
              margin: '16px 0 0',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 30,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: 'var(--text)',
              overflowWrap: 'anywhere',
            }}
          >
            {displayName}
          </h1>
          {profile?.username && (
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-3)' }}>
              @{profile.username}
            </p>
          )}
          {profile?.bio && (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 14,
                lineHeight: 1.45,
                color: 'var(--text-2)',
                maxWidth: 420,
              }}
            >
              {profile.bio}
            </p>
          )}
          {/* Action prominente : éditer le profil */}
          <div style={{ marginTop: 16 }}>
            <button
              className="btn-secondary"
              style={{ width: 'auto' }}
              onClick={() => setEditing(true)}
            >
              Modifier le profil
            </button>
          </div>
        </header>

        {/* ── Chiffres de tête — inline serif, sans cadre ── */}
        <section
          style={{
            ...sectionStyle,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '18px 26px',
            animation: 'fadeUp 320ms var(--ease-out) 60ms both',
          }}
        >
          {figures.map((f) => (
            <div key={f.label}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 30,
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  color: 'var(--text)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {f.value}
              </div>
              <div
                style={{
                  marginTop: 7,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-3)',
                }}
              >
                {f.label}
              </div>
            </div>
          ))}
        </section>

        {/* ── Mes listes — lignes-collections ── */}
        {previewLists.length > 0 && (
          <section
            style={{ ...sectionStyle, animation: 'fadeUp 320ms var(--ease-out) 120ms both' }}
          >
            <SecHead
              title="Mes listes"
              action="Gérer ›"
              onAction={() => router.push('/favorites')}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {previewLists.map((l: ListRow) => (
                <ListCard
                  key={l.id}
                  list={l}
                  variant="row"
                  onClick={() => router.push('/favorites')}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Mes favoris — lignes-favoris ── */}
        <section style={{ ...sectionStyle, animation: 'fadeUp 320ms var(--ease-out) 180ms both' }}>
          <SecHead
            title="Mes favoris"
            action={favorites.length > 0 ? `${favorites.length} ›` : undefined}
            onAction={() => router.push('/favorites')}
          />
          {favorites.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '18px 24px 26px',
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
                  color: 'var(--on-accent)',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {previewFavs.map((f) => (
                <FavRow key={f.id} fav={f} onOpen={() => router.push('/favorites')} />
              ))}
            </div>
          )}
        </section>
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
