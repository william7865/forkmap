'use client'
import { useEffect, useState } from 'react'
import { ChevronLeft, UserPlus, Bell } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import ChatThread from '@/components/social/ChatThread'
import NotificationsSheet from '@/components/social/NotificationsSheet'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import type { ConversationSummary, ActivityItem } from '@/types'

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

export default function MessagesInbox({
  onClose,
  onAddFriends,
  asPage,
}: {
  onClose?: () => void
  onAddFriends?: () => void
  asPage?: boolean
}) {
  const [convos, setConvos] = useState<ConversationSummary[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<ConversationSummary['user'] | null>(null)
  const [showNotifs, setShowNotifs] = useState(false)
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  const load = async () => {
    try {
      const res = await apiFetch('/api/conversations', { headers: await getAuthHeaders() })
      if (res.ok) setConvos(((await res.json()).data ?? []) as ConversationSummary[])
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    if (asPage) {
      ;(async () => {
        try {
          const headers = await getAuthHeaders()
          const [act, notif] = await Promise.all([
            apiFetch('/api/activity', { headers }),
            apiFetch('/api/notifications', { headers }),
          ])
          if (act.ok) setActivities(((await act.json()).data ?? []) as ActivityItem[])
          if (notif.ok) {
            const list = ((await notif.json()).data ?? []) as { read_at: string | null }[]
            setUnreadNotifs(list.filter((n) => !n.read_at).length)
          }
        } catch {
          /* noop */
        }
      })()
    }
  }, [asPage])

  return (
    <div
      style={
        asPage
          ? {
              minHeight: '100vh',
              background: 'var(--bg)',
              overflowY: 'auto',
              paddingBottom: 'calc(var(--safe-bottom) + 84px)',
            }
          : {
              position: 'fixed',
              inset: 0,
              zIndex: 1450,
              background: 'var(--bg)',
              overflowY: 'auto',
              paddingBottom: 'calc(var(--safe-bottom) + 40px)',
            }
      }
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: 'calc(var(--safe-top) + 14px) 18px 10px',
        }}
      >
        {onClose && !asPage && (
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
            <ChevronLeft size={24} />
          </button>
        )}
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          Messages
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {asPage && (
            <button
              onClick={() => {
                setShowNotifs(true)
                setUnreadNotifs(0)
              }}
              aria-label="Notifications"
              style={{
                position: 'relative',
                width: 44,
                height: 44,
                borderRadius: 999,
                border: '1px solid var(--b2)',
                background: 'var(--white)',
                color: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Bell size={20} />
              {unreadNotifs > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    borderRadius: 999,
                    background: '#e5484d',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: '16px',
                    textAlign: 'center',
                    border: '2px solid var(--white)',
                  }}
                >
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </button>
          )}
          {onAddFriends && (
            <button
              onClick={onAddFriends}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 'var(--r-pill)',
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <UserPlus size={16} strokeWidth={2.2} /> Ajouter
            </button>
          )}
        </div>
      </div>

      {asPage && activities.length > 0 && (
        <div style={{ padding: '4px 18px 8px' }}>
          <h2
            style={{
              margin: '0 0 10px',
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--ink)',
            }}
          >
            Activité récente
          </h2>
          {activities.slice(0, 8).map((a) => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid var(--b1)',
              }}
            >
              <Avatar
                name={a.actor.display_name}
                src={a.actor.avatar_url}
                id={a.actor.id}
                size={38}
              />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--ink)' }}>
                {activityText(a)}
              </span>
              <span style={{ flexShrink: 0, fontSize: 11.5, color: 'var(--text-3)' }}>
                {timeAgo(a.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      {asPage && activities.length > 0 && (
        <h2
          style={{
            margin: '12px 0 0',
            padding: '0 18px',
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--ink)',
          }}
        >
          Conversations
        </h2>
      )}

      <div style={{ padding: '8px 12px 0' }}>
        {loading && <Muted>Chargement…</Muted>}
        {!loading && convos.length === 0 && (
          <Muted>Aucune conversation. Ouvre le profil d&apos;un ami pour lui écrire.</Muted>
        )}
        {convos.map((c) => (
          <button
            key={c.user.id}
            onClick={() => setOpen(c.user)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              textAlign: 'left',
              padding: '12px 12px',
              marginBottom: 6,
              background: 'var(--white)',
              border: '1px solid var(--b2)',
              borderRadius: 'var(--r-md)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Avatar name={c.user.display_name} src={c.user.avatar_url} id={c.user.id} size={46} />
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
                {c.user.display_name}
              </strong>
              <span
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: c.unread > 0 ? 'var(--ink)' : 'var(--text-3)',
                  fontWeight: c.unread > 0 ? 700 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.last_from_me ? 'Toi : ' : ''}
                {c.last_message}
              </span>
            </span>
            {c.unread > 0 && (
              <span
                style={{
                  flexShrink: 0,
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 6px',
                }}
              >
                {c.unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {open && (
        <ChatThread
          user={open}
          onClose={() => {
            setOpen(null)
            load()
          }}
        />
      )}

      {showNotifs && <NotificationsSheet onClose={() => setShowNotifs(false)} />}
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '8px 4px', fontSize: 13.5, color: 'var(--text-3)' }}>{children}</p>
}
