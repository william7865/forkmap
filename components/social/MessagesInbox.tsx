'use client'
import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  UserPlus,
  Bell,
  MoreHorizontal,
  BellOff,
  MessageCircle,
  Search,
  Newspaper,
} from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import ChatThread from '@/components/social/ChatThread'
import NotificationsSheet from '@/components/social/NotificationsSheet'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { useOnlineUsers } from '@/lib/presence'
import type { ConversationSummary, Profile, FriendSuggestion, FriendRequests } from '@/types'

export default function MessagesInbox({
  onClose,
  onAddFriends,
  onOpenFeed,
  asPage,
}: {
  onClose?: () => void
  onAddFriends?: () => void
  onOpenFeed?: () => void
  asPage?: boolean
}) {
  const [convos, setConvos] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<ConversationSummary['user'] | null>(null)
  const [showNotifs, setShowNotifs] = useState(false)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [convMenu, setConvMenu] = useState<ConversationSummary | null>(null)
  const [friends, setFriends] = useState<Profile[]>([])
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([])
  const [requestsCount, setRequestsCount] = useState(0)
  const [convSearch, setConvSearch] = useState('')
  const online = useOnlineUsers()

  const filteredConvos = convSearch.trim()
    ? convos.filter((c) =>
        c.user.display_name.toLowerCase().includes(convSearch.trim().toLowerCase())
      )
    : convos

  const addSuggestion = async (s: FriendSuggestion) => {
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id))
    try {
      await apiFetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ userId: s.id }),
      })
    } catch {
      /* noop */
    }
  }

  // Amis triés : en ligne d'abord.
  const sortedFriends = [...friends].sort((a, b) => {
    const ao = online.has(a.id) ? 0 : 1
    const bo = online.has(b.id) ? 0 : 1
    return ao - bo
  })

  const toggleMute = async (c: ConversationSummary) => {
    const muted = !c.muted
    setConvos((prev) => prev.map((x) => (x.user.id === c.user.id ? { ...x, muted } : x)))
    setConvMenu(null)
    try {
      await apiFetch(`/api/conversations/${c.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ muted }),
      })
    } catch {
      /* noop */
    }
  }
  const deleteConv = async (c: ConversationSummary) => {
    setConvos((prev) => prev.filter((x) => x.user.id !== c.user.id))
    setConvMenu(null)
    try {
      await apiFetch(`/api/conversations/${c.user.id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      })
    } catch {
      /* noop */
    }
  }

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
          const [notif, fr, sugg, req] = await Promise.all([
            apiFetch('/api/notifications', { headers }),
            apiFetch('/api/friends', { headers }),
            apiFetch('/api/friends/suggestions', { headers }),
            apiFetch('/api/friends/requests', { headers }),
          ])
          if (notif.ok) {
            const list = ((await notif.json()).data ?? []) as { read_at: string | null }[]
            setUnreadNotifs(list.filter((n) => !n.read_at).length)
          }
          if (fr.ok) setFriends(((await fr.json()).data ?? []) as Profile[])
          if (sugg.ok) setSuggestions(((await sugg.json()).data ?? []) as FriendSuggestion[])
          if (req.ok) {
            const r = ((await req.json()).data ?? { received: [], sent: [] }) as FriendRequests
            setRequestsCount(r.received?.length ?? 0)
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
          {onOpenFeed && (
            <button
              onClick={onOpenFeed}
              aria-label="Fil d'activité"
              style={{
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
              <Newspaper size={20} />
            </button>
          )}
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

      {/* Demandes d'ami reçues */}
      {asPage && requestsCount > 0 && onAddFriends && (
        <button
          onClick={onAddFriends}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: 'calc(100% - 36px)',
            margin: '4px 18px 6px',
            padding: '12px 14px',
            borderRadius: 'var(--r-lg)',
            border: '1px solid var(--accent)',
            background: 'var(--accent-light)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 999,
              background: 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserPlus size={18} strokeWidth={2.2} />
          </span>
          <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <span
              style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}
            >
              {requestsCount} demande{requestsCount > 1 ? 's' : ''} d&apos;ami
            </span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-2)' }}>
              Touche pour voir
            </span>
          </span>
          <MoreHorizontal size={20} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        </button>
      )}

      {/* Amis actifs — tap pour discuter (façon « active now ») */}
      {asPage && sortedFriends.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <p
            style={{
              margin: '0 18px 4px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}
          >
            Amis
          </p>
          <div
            style={{
              display: 'flex',
              gap: 14,
              overflowX: 'auto',
              padding: '6px 18px 12px',
              scrollbarWidth: 'none',
            }}
            className="no-scrollbar"
          >
            {sortedFriends.map((f) => (
              <button
                key={f.id}
                onClick={() => setOpen(f)}
                style={{
                  flexShrink: 0,
                  width: 64,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span style={{ position: 'relative' }}>
                  <Avatar name={f.display_name} src={f.avatar_url} id={f.id} size={58} />
                  {online.has(f.id) && (
                    <span
                      aria-label="En ligne"
                      style={{
                        position: 'absolute',
                        bottom: 1,
                        right: 1,
                        width: 15,
                        height: 15,
                        borderRadius: '50%',
                        background: 'var(--open)',
                        border: '3px solid var(--bg)',
                      }}
                    />
                  )}
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    color: 'var(--text-2)',
                    fontWeight: 500,
                    maxWidth: 64,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.display_name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {asPage && !loading && convos.length > 0 && (
        <p
          style={{
            margin: '4px 18px 0',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}
        >
          Discussions
        </p>
      )}
      {asPage && convos.length > 3 && (
        <div style={{ position: 'relative', margin: '8px 18px 0' }}>
          <Search
            size={17}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-3)',
            }}
          />
          <input
            className="input-field"
            type="text"
            placeholder="Rechercher une conversation"
            value={convSearch}
            onChange={(e) => setConvSearch(e.target.value)}
            aria-label="Rechercher une conversation"
            style={{
              paddingLeft: 38,
              height: 44,
              borderRadius: 999,
              background: 'var(--surface-2)',
              border: 'none',
            }}
          />
        </div>
      )}

      <div style={{ padding: '8px 12px 0' }}>
        {loading && <Muted>Chargement…</Muted>}
        {!loading && convos.length === 0 && (
          <EmptyConversations hasFriends={friends.length > 0} onAddFriends={onAddFriends} />
        )}
        {filteredConvos.map((c) => (
          <div
            key={c.user.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 8px 10px 12px',
              marginBottom: 6,
              background: 'var(--white)',
              border: '1px solid var(--b2)',
              borderRadius: 'var(--r-md)',
            }}
          >
            <button
              onClick={() => setOpen(c.user)}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              <span style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar
                  name={c.user.display_name}
                  src={c.user.avatar_url}
                  id={c.user.id}
                  size={46}
                />
                {online.has(c.user.id) && (
                  <span
                    aria-label="En ligne"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      background: 'var(--open)',
                      border: '2.5px solid var(--white)',
                    }}
                  />
                )}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 15,
                    color: 'var(--ink)',
                  }}
                >
                  {c.user.display_name}
                  {c.muted && <BellOff size={13} color="var(--text-3)" />}
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
            </button>
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
            <button
              onClick={() => setConvMenu(c)}
              aria-label="Options de la conversation"
              style={{
                flexShrink: 0,
                width: 36,
                height: 36,
                borderRadius: 999,
                border: 'none',
                background: 'none',
                color: 'var(--text-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Suggestions — personnes que tu connais peut-être */}
      {asPage && suggestions.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <p
            style={{
              margin: '0 18px 4px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}
          >
            Suggestions pour toi
          </p>
          <div
            className="no-scrollbar"
            style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '6px 18px 8px' }}
          >
            {suggestions.map((s) => (
              <div
                key={s.id}
                style={{
                  flexShrink: 0,
                  width: 150,
                  padding: 14,
                  borderRadius: 'var(--r-lg)',
                  background: 'var(--white)',
                  border: '1px solid var(--b2)',
                  boxShadow: 'var(--s1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 4,
                }}
              >
                <Avatar name={s.display_name} src={s.avatar_url} id={s.id} size={64} />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.display_name}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 6 }}>
                  {s.mutuals} ami{s.mutuals > 1 ? 's' : ''} en commun
                </span>
                <button
                  onClick={() => addSuggestion(s)}
                  style={{
                    width: '100%',
                    padding: '8px 0',
                    borderRadius: 999,
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                  }}
                >
                  Ajouter
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Menu d'une conversation (muet / supprimer) */}
      {convMenu && (
        <div
          onClick={() => setConvMenu(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1600,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: 'var(--bg)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: '8px 8px calc(var(--safe-bottom) + 10px)',
              animation: 'slideUp 200ms cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            <p
              style={{
                margin: '6px 16px 8px',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-3)',
              }}
            >
              {convMenu.user.display_name}
            </p>
            <ConvSheetBtn onClick={() => toggleMute(convMenu)}>
              {convMenu.muted ? 'Réactiver les notifications' : 'Rendre muet'}
            </ConvSheetBtn>
            <ConvSheetBtn danger onClick={() => deleteConv(convMenu)}>
              Supprimer la conversation
            </ConvSheetBtn>
            <ConvSheetBtn onClick={() => setConvMenu(null)}>Annuler</ConvSheetBtn>
          </div>
        </div>
      )}
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '8px 4px', fontSize: 13.5, color: 'var(--text-3)' }}>{children}</p>
}

function EmptyConversations({
  hasFriends,
  onAddFriends,
}: {
  hasFriends: boolean
  onAddFriends?: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        gap: 6,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          background: 'var(--surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-3)',
          marginBottom: 6,
        }}
      >
        <MessageCircle size={30} strokeWidth={1.75} />
      </div>
      <h3
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--ink)',
        }}
      >
        Aucune conversation
      </h3>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-3)', maxWidth: 260 }}>
        {hasFriends
          ? 'Touche un ami en haut pour lui écrire, ou partage-lui un resto.'
          : 'Ajoute des amis pour discuter et partager vos adresses préférées.'}
      </p>
      {!hasFriends && onAddFriends && (
        <button
          onClick={onAddFriends}
          style={{
            marginTop: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '11px 20px',
            borderRadius: 'var(--r-pill)',
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <UserPlus size={16} strokeWidth={2.2} /> Ajouter des amis
        </button>
      )}
    </div>
  )
}

function ConvSheetBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '15px 16px',
        borderRadius: 12,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: 15.5,
        fontWeight: 600,
        color: danger ? 'var(--closed)' : 'var(--ink)',
      }}
    >
      {children}
    </button>
  )
}
