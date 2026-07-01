'use client'
// Centre de notifications (demandes d'ami, accept, messages).
import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import type { NotificationItem } from '@/types'

function notifText(n: NotificationItem): string {
  const who = n.actor?.display_name ?? 'Quelqu’un'
  if (n.type === 'friend_request') return `${who} t'a envoyé une demande d'ami`
  if (n.type === 'friend_accept') return `${who} a accepté ta demande d'ami`
  return `${who} t'a envoyé un message`
}
function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  return `il y a ${Math.floor(diff / 86400)} j`
}

export default function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const headers = await getAuthHeaders()
        const res = await apiFetch('/api/notifications', { headers })
        if (res.ok) setItems(((await res.json()).data ?? []) as NotificationItem[])
        // marquer lu (fire-and-forget)
        apiFetch('/api/notifications', { method: 'PATCH', headers }).catch(() => {})
      } catch {
        /* noop */
      } finally {
        setLoading(false)
      }
    })()
  }, [])

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
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', padding: 0 }}
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

      {items.map((n) => (
        <div
          key={n.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            marginBottom: 8,
            background: n.read_at ? 'var(--white)' : 'var(--accent-light)',
            border: '1px solid var(--b2)',
            borderRadius: 'var(--r-lg)',
          }}
        >
          <Avatar
            name={n.actor?.display_name ?? '?'}
            src={n.actor?.avatar_url ?? null}
            id={n.actor?.id ?? n.id}
            size={44}
          />
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--ink)' }}>
            {notifText(n)}
          </span>
          <span style={{ flexShrink: 0, fontSize: 11.5, color: 'var(--text-3)' }}>
            {timeAgo(n.created_at)}
          </span>
        </div>
      ))}
    </div>
  )
}
