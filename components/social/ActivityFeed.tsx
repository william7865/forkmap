'use client'
// ActivityFeed — le « Fil » : ce que les amis ont enregistré / visité / listé.
// Les données existent déjà (activity_events / getFriendActivity / /api/activity) ;
// c'est l'écran dédié qui manquait. Overlay plein écran (pattern FriendsView).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Bookmark, MapPin, Star, ListPlus, Users } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { frCuisine } from '@/lib/cuisine'
import type { ActivityItem } from '@/types'

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `il y a ${d} j`
  return `il y a ${Math.floor(d / 7)} sem`
}

function Verb({ item }: { item: ActivityItem }) {
  const target =
    item.type === 'list' ? (item.list_name ?? 'une liste') : (item.place_name ?? 'un lieu')
  const verb =
    item.type === 'favorite'
      ? 'a enregistré'
      : item.type === 'visit'
        ? 'a visité'
        : 'a créé la liste'
  return (
    <span style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.4 }}>
      <b style={{ color: 'var(--text)', fontWeight: 700 }}>{item.actor.display_name}</b> {verb}{' '}
      <b style={{ color: 'var(--text)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
        {target}
      </b>
    </span>
  )
}

function TypeIcon({ type }: { type: ActivityItem['type'] }) {
  const common = { size: 13, strokeWidth: 2 } as const
  const color =
    type === 'favorite' ? 'var(--accent)' : type === 'visit' ? 'var(--open)' : 'var(--text-2)'
  return (
    <span style={{ color, display: 'inline-flex' }}>
      {type === 'favorite' ? (
        <Bookmark {...common} fill="currentColor" />
      ) : type === 'visit' ? (
        <MapPin {...common} />
      ) : (
        <ListPlus {...common} />
      )}
    </span>
  )
}

export default function ActivityFeed({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getAuthHeaders().then((headers) =>
      apiFetch('/api/activity', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { data?: ActivityItem[] } | null) => {
          if (!cancelled) setItems(j?.data ?? [])
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    )
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 240ms cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 'calc(var(--safe-top) + 10px) 16px 12px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Retour"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            padding: 0,
            color: 'var(--ink)',
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 19,
            color: 'var(--ink)',
          }}
        >
          Fil
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            Chargement…
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              padding: '56px 32px',
              textAlign: 'center',
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
              <Users size={26} strokeWidth={1.6} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                Rien de neuf… pour l&apos;instant
              </div>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 13.5,
                  color: 'var(--text-2)',
                  lineHeight: 1.5,
                }}
              >
                Ajoute des amis pour suivre les restos qu&apos;ils découvrent, enregistrent et
                testent.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/u/${item.actor.username}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              >
                <Avatar
                  name={item.actor.display_name}
                  src={item.actor.avatar_url}
                  id={item.actor.id}
                  size={42}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Verb item={item} />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      marginTop: 3,
                      fontSize: 11.5,
                      color: 'var(--text-3)',
                    }}
                  >
                    <TypeIcon type={item.type} />
                    {item.cuisine && <span>{frCuisine(item.cuisine)}</span>}
                    {item.type === 'visit' && item.rating != null && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2,
                          color: 'var(--text-2)',
                          fontWeight: 700,
                        }}
                      >
                        <Star size={11} strokeWidth={0} fill="var(--star)" />
                        {item.rating}
                      </span>
                    )}
                    <span style={{ opacity: 0.6 }}>·</span>
                    <span>{timeAgo(item.created_at)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
