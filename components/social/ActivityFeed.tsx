'use client'
// ActivityFeed — le « Fil » : ce que les amis ont enregistré / visité / listé.
// Les données existent déjà (activity_events / getFriendActivity / /api/activity) ;
// c'est l'écran dédié qui manquait. Overlay plein écran (pattern FriendsView).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Bookmark, MapPin, Star, ListPlus, Users } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import VerifiedBadge from '@/components/social/VerifiedBadge'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { frCuisine } from '@/lib/cuisine'
import type { ActivityItem, TastemakerFeedItem } from '@/types'

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

function TastemakerFeed({
  feed,
  loading,
  onOpenProfile,
}: {
  feed: TastemakerFeedItem[] | null
  loading: boolean
  onOpenProfile: (username: string) => void
}) {
  if (loading || feed === null) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
        Chargement…
      </div>
    )
  }
  if (feed.length === 0) {
    return (
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
          <Star size={26} strokeWidth={1.6} />
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
            Suis des tastemakers
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
            Suis des gens dont tu aimes le goût — leurs avis apparaîtront ici.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {feed.map((it) => (
        <button
          key={it.id}
          onClick={() => it.author.username && onOpenProfile(it.author.username)}
          style={{
            display: 'flex',
            gap: 12,
            padding: '14px 20px',
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
            name={it.author.display_name}
            src={it.author.avatar_url}
            id={it.author.id}
            size={42}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.4 }}>
              <b
                style={{
                  color: 'var(--text)',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {it.author.display_name}
                <VerifiedBadge verified={it.author.verified} size={13} />
              </b>{' '}
              a noté{' '}
              <b
                style={{ color: 'var(--text)', fontWeight: 600, fontFamily: 'var(--font-display)' }}
              >
                {it.place_name}
              </b>
            </span>
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
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  color: 'var(--text-2)',
                  fontWeight: 700,
                }}
              >
                <Star size={11} strokeWidth={0} fill="var(--accent)" />
                {it.rating}/5
              </span>
              <span style={{ opacity: 0.6 }}>·</span>
              <span>{timeAgo(it.created_at)}</span>
            </div>
            {it.text && (
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 13,
                  color: 'var(--text-2)',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {it.text}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

export default function ActivityFeed({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [tab, setTab] = useState<'friends' | 'tastemakers'>('friends')
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [feed, setFeed] = useState<TastemakerFeedItem[] | null>(null)
  const [feedLoading, setFeedLoading] = useState(false)

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

  // Lazy-load the tastemaker feed the first time the tab is opened.
  useEffect(() => {
    if (tab !== 'tastemakers' || feed !== null) return
    let cancelled = false
    setFeedLoading(true)
    getAuthHeaders().then((headers) =>
      apiFetch('/api/tastemakers/feed', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { data?: TastemakerFeedItem[] } | null) => {
          if (!cancelled) setFeed(j?.data ?? [])
        })
        .catch(() => {
          if (!cancelled) setFeed([])
        })
        .finally(() => {
          if (!cancelled) setFeedLoading(false)
        })
    )
    return () => {
      cancelled = true
    }
  }, [tab, feed])

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
      {/* Header — grand titre serif */}
      <div style={{ padding: 'calc(var(--safe-top) + 14px) 20px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <button
            onClick={onClose}
            aria-label="Retour"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              padding: 0,
              marginLeft: -4,
              color: 'var(--text)',
            }}
          >
            <ChevronLeft size={26} />
          </button>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 32,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
            }}
          >
            Fil d&apos;activité
          </h1>
        </div>

        {/* Tabs — pastilles */}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          {(['friends', 'tastemakers'] as const).map((t) => {
            const active = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={active}
                style={{
                  height: 36,
                  padding: '0 18px',
                  borderRadius: 999,
                  border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  background: active ? 'var(--accent)' : 'var(--bg)',
                  color: active ? 'var(--on-accent)' : 'var(--text-2)',
                  transition: 'background 140ms',
                }}
              >
                {t === 'friends' ? 'Amis' : 'Tastemakers'}
              </button>
            )
          })}
        </div>
      </div>
      <div style={{ borderBottom: '1px solid var(--border)' }} />

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {tab === 'tastemakers' ? (
          <TastemakerFeed
            feed={feed}
            loading={feedLoading}
            onOpenProfile={(username) => router.push(`/u/${username}`)}
          />
        ) : loading ? (
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
                  padding: '14px 20px',
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
