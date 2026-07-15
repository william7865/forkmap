'use client'
// Centre de notifications : demandes d'ami / accept / messages + activité des amis,
// fusionnés en un fil chronologique. Les notifications sont supprimables.
import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import SwipeRow from '@/components/ui/SwipeRow'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import type { NotificationItem, ActivityItem } from '@/types'

type Actor = { id: string; display_name: string; avatar_url: string | null } | null
type FeedItem = {
  key: string
  created_at: string
  actor: Actor
  text: string
  notifId?: string // présent = supprimable
}

function notifText(n: NotificationItem): string {
  const who = n.actor?.display_name ?? 'Quelqu’un'
  const d = (n.data ?? {}) as { place_name?: string; list_name?: string }
  if (n.type === 'friend_request') return `${who} t'a envoyé une demande d'ami`
  if (n.type === 'friend_accept') return `${who} a accepté ta demande d'ami`
  if (n.type === 'tastemaker_save') return `${who} a enregistré ${d.place_name ?? 'un resto'}`
  if (n.type === 'tastemaker_list')
    return `${who} a mis à jour sa liste ${d.list_name ?? ''}`.trim()
  return `${who} t'a envoyé un message`
}
function activityText(a: ActivityItem): string {
  const who = a.actor.display_name
  if (a.type === 'favorite') return `${who} a enregistré ${a.place_name ?? 'un resto'}`
  if (a.type === 'visit') {
    const stars = a.rating ? ` ${'★'.repeat(Math.round(a.rating))}` : ''
    return `${who} a noté ${a.place_name ?? 'un resto'}${stars}`
  }
  return `${who} a créé la liste ${a.list_name ?? ''}`.trim()
}
function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  return `il y a ${Math.floor(diff / 86400)} j`
}

export default function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const headers = await getAuthHeaders()
        const [nRes, aRes] = await Promise.all([
          apiFetch('/api/notifications', { headers }),
          apiFetch('/api/activity', { headers }),
        ])
        const notifs = nRes.ok ? ((await nRes.json()).data ?? []) : []
        const acts = aRes.ok ? ((await aRes.json()).data ?? []) : []
        const feed: FeedItem[] = [
          ...(notifs as NotificationItem[]).map((n) => ({
            key: `n:${n.id}`,
            created_at: n.created_at,
            actor: n.actor,
            text: notifText(n),
            notifId: n.id,
          })),
          ...(acts as ActivityItem[]).map((a) => ({
            key: `a:${a.id}`,
            created_at: a.created_at,
            actor: a.actor,
            text: activityText(a),
          })),
        ].sort((x, y) => (x.created_at < y.created_at ? 1 : -1))
        setItems(feed)
        // marquer les notifs lues (fire-and-forget)
        apiFetch('/api/notifications', { method: 'PATCH', headers }).catch(() => {})
      } catch {
        /* noop */
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const removeNotif = async (item: FeedItem) => {
    if (!item.notifId) return
    setItems((prev) => prev.filter((x) => x.key !== item.key))
    try {
      await apiFetch(`/api/notifications/${item.notifId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      })
    } catch {
      /* noop */
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1550,
        background: 'var(--bg)',
        overflowY: 'auto',
        padding: 'calc(var(--safe-top) + 14px) 18px calc(var(--safe-bottom) + 40px)',
        animation: 'slideUp 240ms cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button
          onClick={onClose}
          aria-label="Retour"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ink)',
            padding: 0,
          }}
        >
          <ChevronLeft size={26} />
        </button>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          Notifications
        </h1>
      </div>

      {loading && <p style={{ color: 'var(--text-3)', fontSize: 13.5 }}>Chargement…</p>}
      {!loading && items.length === 0 && (
        <p style={{ color: 'var(--text-3)', fontSize: 13.5 }}>
          Aucune notification pour l&apos;instant.
        </p>
      )}

      {items.map((it) => (
        <div
          key={it.key}
          style={{
            marginBottom: 8,
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
            border: '1px solid var(--b2)',
          }}
        >
          <SwipeRow
            actions={
              it.notifId
                ? [{ label: 'Supprimer', bg: 'var(--closed)', onClick: () => removeNotif(it) }]
                : []
            }
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: 'var(--white)',
              }}
            >
              <Avatar
                name={it.actor?.display_name ?? '?'}
                src={it.actor?.avatar_url ?? null}
                id={it.actor?.id ?? it.key}
                size={44}
              />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--ink)' }}>
                {it.text}
              </span>
              <span style={{ flexShrink: 0, fontSize: 11.5, color: 'var(--text-3)' }}>
                {timeAgo(it.created_at)}
              </span>
            </div>
          </SwipeRow>
        </div>
      ))}
    </div>
  )
}
