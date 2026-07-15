'use client'
import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  UserPlus,
  Bell,
  BellOff,
  MessageCircle,
  Search,
  Newspaper,
} from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import ChatThread from '@/components/social/ChatThread'
import NotificationsSheet from '@/components/social/NotificationsSheet'
import SwipeRow from '@/components/ui/SwipeRow'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { useOnlineUsers } from '@/lib/presence'
import { staggerDelay } from '@/lib/motion'
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

  const convCount = convos.length

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
      {/* ── Masthead : actions en haut, puis grand titre serif ── */}
      <div style={{ padding: 'calc(var(--safe-top) + 16px) 20px 4px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 38,
            marginBottom: 12,
          }}
        >
          {onClose && !asPage ? (
            <button
              onClick={onClose}
              aria-label="Retour"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text)',
                padding: 0,
                marginLeft: -4,
              }}
            >
              <ChevronLeft size={26} />
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onOpenFeed && (
              <button onClick={onOpenFeed} aria-label="Fil d'activité" style={iconBtnStyle}>
                <Newspaper size={18} strokeWidth={1.8} />
              </button>
            )}
            {asPage && (
              <button
                onClick={() => {
                  setShowNotifs(true)
                  setUnreadNotifs(0)
                }}
                aria-label="Notifications"
                style={{ ...iconBtnStyle, position: 'relative' }}
              >
                <Bell size={18} strokeWidth={1.8} />
                {unreadNotifs > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      minWidth: 15,
                      height: 15,
                      padding: '0 4px',
                      borderRadius: 999,
                      background: '#e5484d',
                      color: '#fff',
                      fontSize: 9.5,
                      fontWeight: 700,
                      lineHeight: '15px',
                      textAlign: 'center',
                      border: '2px solid var(--bg)',
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
                aria-label="Ajouter des amis"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 38,
                  padding: '0 16px',
                  borderRadius: 999,
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={16} strokeWidth={2.1} /> Ajouter
              </button>
            )}
          </div>
        </div>
        <h1
          className="anim-fade-up"
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 33,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: 'var(--text)',
          }}
        >
          Messages
        </h1>
        {asPage && convCount > 0 && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
            {convCount} conversation{convCount > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Demandes d'ami reçues */}
      {asPage && requestsCount > 0 && onAddFriends && (
        <button
          onClick={onAddFriends}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            width: 'calc(100% - 40px)',
            margin: '14px 20px 2px',
            padding: '13px 15px',
            borderRadius: 'var(--r-lg)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 999,
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserPlus size={19} strokeWidth={2.1} />
          </span>
          <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--text)',
              }}
            >
              {requestsCount} demande{requestsCount > 1 ? 's' : ''} d&apos;ami
            </span>
            <span
              style={{ display: 'block', marginTop: 1, fontSize: 12.5, color: 'var(--text-3)' }}
            >
              Touche pour voir
            </span>
          </span>
          <ChevronLeft
            size={19}
            style={{ color: 'var(--text-4)', flexShrink: 0, transform: 'rotate(180deg)' }}
          />
        </button>
      )}

      {/* Amis actifs — tap pour discuter (façon « active now ») */}
      {asPage && sortedFriends.length > 0 && (
        <section style={{ marginTop: 22 }}>
          <SecHead title="Amis" action="Gérer ›" onAction={onAddFriends} />
          <div
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              padding: '2px 20px 4px',
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
                  width: 62,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 7,
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
                        width: 14,
                        height: 14,
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
                    maxWidth: 62,
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
        </section>
      )}

      {/* ── Discussions ── */}
      {asPage && !loading && convos.length > 0 && (
        <SecHead title="Discussions" style={{ marginTop: 24 }} />
      )}
      {asPage && convos.length > 3 && (
        <div
          style={{
            position: 'relative',
            margin: '2px 20px 6px',
            height: 46,
          }}
        >
          <Search
            size={17}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-4)',
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
              paddingLeft: 40,
              height: 46,
              borderRadius: 15,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          />
        </div>
      )}

      <div style={{ padding: '2px 20px 0' }}>
        {loading && <Muted>Chargement…</Muted>}
        {!loading && convos.length === 0 && (
          <EmptyConversations hasFriends={friends.length > 0} onAddFriends={onAddFriends} />
        )}
        {filteredConvos.map((c, i) => (
          <div
            key={c.user.id}
            className="anim-fade-up"
            style={{
              animationDelay: staggerDelay(i),
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
            }}
          >
            <SwipeRow
              actions={[
                {
                  label: c.muted ? 'Activer' : 'Muet',
                  bg: 'var(--text-3)',
                  onClick: () => toggleMute(c),
                },
                { label: 'Supprimer', bg: 'var(--closed)', onClick: () => deleteConv(c) },
              ]}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0' }}>
                <button
                  onClick={() => setOpen(c.user)}
                  className="tap-press"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
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
                      size={54}
                    />
                    {online.has(c.user.id) && (
                      <span
                        aria-label="En ligne"
                        style={{
                          position: 'absolute',
                          bottom: 1,
                          right: 1,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: 'var(--open)',
                          border: '3px solid var(--bg)',
                        }}
                      />
                    )}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        fontSize: 16.5,
                        letterSpacing: '-0.01em',
                        color: 'var(--text)',
                      }}
                    >
                      {c.user.display_name}
                      {c.muted && <BellOff size={13} color="var(--text-4)" />}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 3,
                        fontSize: 13.5,
                        color: c.unread > 0 ? 'var(--text)' : 'var(--text-3)',
                        fontWeight: c.unread > 0 ? 600 : 400,
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
                      color: 'var(--on-accent)',
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
              </div>
            </SwipeRow>
          </div>
        ))}
      </div>

      {/* Suggestions — personnes que tu connais peut-être */}
      {asPage && suggestions.length > 0 && (
        <section style={{ marginTop: 26 }}>
          <SecHead title="Suggestions" />
          <div
            className="no-scrollbar"
            style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '2px 20px 4px' }}
          >
            {suggestions.map((s) => (
              <div
                key={s.id}
                style={{
                  flexShrink: 0,
                  width: 150,
                  padding: 15,
                  borderRadius: 'var(--r-lg)',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 4,
                }}
              >
                <Avatar name={s.display_name} src={s.avatar_url} id={s.id} size={62} />
                <span
                  style={{
                    marginTop: 4,
                    fontFamily: 'var(--font-display)',
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    color: 'var(--text)',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.display_name}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8 }}>
                  {s.mutuals} ami{s.mutuals > 1 ? 's' : ''} en commun
                </span>
                <button
                  onClick={() => addSuggestion(s)}
                  style={{
                    width: '100%',
                    padding: '9px 0',
                    borderRadius: 999,
                    border: 'none',
                    background: 'var(--accent)',
                    color: 'var(--on-accent)',
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
        </section>
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
    </div>
  )
}

// Bouton-icône rond de la barre du haut
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

// En-tête de section serif (avec action discrète optionnelle)
function SecHead({
  title,
  action,
  onAction,
  style,
}: {
  title: string
  action?: string
  onAction?: () => void
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        padding: '0 20px',
        marginBottom: 12,
        ...style,
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
      {action && onAction && (
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

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '8px 0', fontSize: 13.5, color: 'var(--text-3)' }}>{children}</p>
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
        padding: '48px 24px',
        gap: 6,
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
          marginBottom: 8,
        }}
      >
        <MessageCircle size={28} strokeWidth={1.6} />
      </div>
      <h3
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--text)',
        }}
      >
        Aucune conversation
      </h3>
      <p
        style={{
          margin: '4px 0 0',
          fontSize: 13.5,
          color: 'var(--text-2)',
          maxWidth: 260,
          lineHeight: 1.5,
        }}
      >
        {hasFriends
          ? 'Touche un ami en haut pour lui écrire, ou partage-lui un resto.'
          : 'Ajoute des amis pour discuter et partager vos adresses préférées.'}
      </p>
      {!hasFriends && onAddFriends && (
        <button
          onClick={onAddFriends}
          style={{
            marginTop: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '11px 20px',
            borderRadius: 999,
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            fontFamily: 'var(--font-body)',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <UserPlus size={16} strokeWidth={2.1} /> Ajouter des amis
        </button>
      )}
    </div>
  )
}
