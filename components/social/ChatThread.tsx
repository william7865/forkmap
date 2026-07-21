'use client'
import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Send, MapPin, X, BarChart3 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Avatar } from '@/components/social/Avatar'
import { useAuth, getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
// Import dynamique : PublicProfile importe déjà ChatThread → casse le cycle d'imports.
const PublicProfile = dynamic(() => import('@/components/social/PublicProfile'), { ssr: false })
const PublicPoll = dynamic(() => import('@/components/poll/PublicPoll'), { ssr: false })
import { useChatThread } from '@/lib/hooks/useChatThread'
import { frCuisine } from '@/lib/cuisine'
import { setPendingSelect } from '@/lib/pendingSelect'
import { useOnlineUsers } from '@/lib/presence'
import type { PlaceCard, MessagePlacePayload, MessagePollPayload } from '@/types'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RealtimeChannel = any

function formatDay(d: Date): string {
  const now = new Date()
  const today = now.toDateString()
  const yest = new Date(now.getTime() - 86400000).toDateString()
  if (d.toDateString() === today) return "Aujourd'hui"
  if (d.toDateString() === yest) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatThread({
  user,
  onClose,
}: {
  user: { id: string; display_name: string; username: string; avatar_url: string | null }
  onClose: () => void
}) {
  const auth = useAuth()
  const router = useRouter()
  const myId = auth.user?.id ?? ''
  const { messages, loading, send, sending, editMsg, removeMsg, react } = useChatThread(
    user.id,
    myId
  )
  const [text, setText] = useState('')
  const [sendError, setSendError] = useState(false)
  const [menuFor, setMenuFor] = useState<(typeof messages)[number] | null>(null)
  const [editing, setEditing] = useState<(typeof messages)[number] | null>(null)
  const [replyTo, setReplyTo] = useState<(typeof messages)[number] | null>(null)
  const [viewProfile, setViewProfile] = useState(false)
  const [openPoll, setOpenPoll] = useState<string | null>(null)
  const REACTIONS = ['❤️', '😂', '👍', '🔥', '😮', '😢']
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onlineUsers = useOnlineUsers()
  const otherOnline = onlineUsers.has(user.id) // présence GLOBALE (ami sur l'app)
  const [otherTyping, setOtherTyping] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const chanRef = useRef<RealtimeChannel | null>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSent = useRef(0)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  // Canal par paire — sert uniquement à l'indicateur « écrit… » (l'« en ligne »
  // vient de la présence globale). Broadcast, pas de presence tracking ici.
  useEffect(() => {
    if (!myId) return
    const sb = getSupabaseBrowserClient()
    const key = [myId, user.id].sort().join(':')
    const ch = sb.channel(`chat-typing:${key}`)
    ch.on('broadcast', { event: 'typing' }, (msg: { payload?: { from?: string } }) => {
      if (msg.payload?.from !== user.id) return
      setOtherTyping(true)
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => setOtherTyping(false), 2500)
    }).subscribe()
    chanRef.current = ch
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
      sb.removeChannel(ch)
      chanRef.current = null
    }
  }, [myId, user.id])

  const broadcastTyping = () => {
    const now = Date.now()
    if (now - lastTypingSent.current < 1500) return
    lastTypingSent.current = now
    chanRef.current?.send({ type: 'broadcast', event: 'typing', payload: { from: myId } })
  }

  const onSend = async () => {
    const t = text.trim()
    if (!t) return
    // Mode édition : on met à jour le message existant.
    if (editing) {
      const target = editing
      setText('')
      setEditing(null)
      const ok = await editMsg(target.id, t)
      if (!ok) {
        setText(t)
        setEditing(target)
        setSendError(true)
      }
      return
    }
    setText('')
    setSendError(false)
    const rt = replyTo?.id ?? null
    setReplyTo(null)
    const ok = await send(t, rt)
    if (!ok) {
      setText(t) // restaure le message pour que l'utilisateur puisse réessayer
      setSendError(true)
    }
  }

  const startPress = (m: (typeof messages)[number]) => {
    if (m.deleted_at) return
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => setMenuFor(m), 450)
  }
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  const sheet = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: 'calc(var(--safe-top) + 10px) 14px 10px',
          borderBottom: '1px solid var(--b2)',
          background: 'var(--white)',
        }}
      >
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
        <button
          onClick={() => setViewProfile(true)}
          aria-label={`Voir le profil de ${user.display_name}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            minWidth: 0,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Avatar name={user.display_name} src={user.avatar_url} id={user.id} size={38} />
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <strong
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: '-0.01em',
                color: 'var(--ink)',
              }}
            >
              {user.display_name}
            </strong>
            <span
              style={{
                fontSize: 12,
                color: otherTyping || otherOnline ? 'var(--open)' : 'var(--text-3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {(otherTyping || otherOnline) && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--open)',
                    flexShrink: 0,
                  }}
                />
              )}
              {otherTyping ? 'écrit…' : otherOnline ? 'en ligne' : `@${user.username}`}
            </span>
          </span>
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Chargement…</p>
        )}
        {!loading && messages.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13.5, marginTop: 24 }}>
            Envoie le premier message à {user.display_name} !
          </p>
        )}
        {(() => {
          const lastMineId = [...messages].reverse().find((m) => m.sender_id === myId)?.id
          let lastDay = ''
          return messages.map((m) => {
            const mine = m.sender_id === myId
            const d = new Date(m.created_at)
            const dayKey = d.toDateString()
            const showSep = dayKey !== lastDay
            lastDay = dayKey
            const isLastMine = m.id === lastMineId
            return (
              <Fragment key={m.id}>
                {showSep && (
                  <div
                    style={{
                      alignSelf: 'center',
                      margin: '8px 0 4px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-3)',
                      background: 'var(--surface-2)',
                      padding: '3px 12px',
                      borderRadius: 999,
                    }}
                  >
                    {formatDay(d)}
                  </div>
                )}
                <div
                  onPointerDown={() => startPress(m)}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    if (!m.deleted_at) setMenuFor(m)
                  }}
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '78%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: mine ? 'flex-end' : 'flex-start',
                  }}
                >
                  {/* Message cité (réponse) */}
                  {m.reply_to &&
                    (() => {
                      const q = messages.find((x) => x.id === m.reply_to)
                      return (
                        <div
                          style={{
                            maxWidth: '100%',
                            padding: '5px 10px',
                            marginBottom: -4,
                            borderLeft: '3px solid var(--accent)',
                            background: 'var(--surface-2)',
                            borderRadius: '8px 8px 0 0',
                            fontSize: 12,
                            color: 'var(--text-2)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {q
                            ? q.deleted_at
                              ? 'Message supprimé'
                              : q.type === 'place'
                                ? `📍 ${(q.payload as MessagePlacePayload)?.name ?? 'Lieu'}`
                                : q.type === 'poll'
                                  ? `🗳️ ${(q.payload as MessagePollPayload)?.title ?? 'Sondage'}`
                                  : q.content
                            : 'Message'}
                        </div>
                      )
                    })()}
                  {m.deleted_at ? (
                    <div
                      style={{
                        padding: '9px 13px',
                        borderRadius: 16,
                        background: mine ? 'var(--surface-2)' : 'var(--white)',
                        color: 'var(--text-3)',
                        border: '1px solid var(--b2)',
                        fontSize: 13.5,
                        fontStyle: 'italic',
                      }}
                    >
                      Message supprimé
                    </div>
                  ) : m.type === 'poll' && m.payload ? (
                    <button
                      onClick={() => setOpenPoll((m.payload as MessagePollPayload).poll_id)}
                      style={{
                        width: 240,
                        maxWidth: '100%',
                        padding: '14px 14px',
                        border: mine ? 'none' : '1px solid var(--b2)',
                        borderRadius: 16,
                        background: 'var(--white)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: 'var(--s1)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          color: 'var(--star)',
                          marginBottom: 6,
                        }}
                      >
                        <BarChart3 size={13} /> Sondage
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 600,
                          fontSize: 15.5,
                          color: 'var(--ink)',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {(m.payload as MessagePollPayload).title}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12.5,
                          color: 'var(--accent-text)',
                          fontWeight: 700,
                        }}
                      >
                        Voter →
                      </div>
                    </button>
                  ) : m.type === 'place' && m.payload ? (
                    <button
                      onClick={() => {
                        const p = m.payload as MessagePlacePayload
                        const osmType = p.osm_id.startsWith('way')
                          ? 'way'
                          : p.osm_id.startsWith('relation')
                            ? 'relation'
                            : 'node'
                        setPendingSelect({
                          osm_id: p.osm_id,
                          osm_type: osmType,
                          name: p.name,
                          lat: p.lat ?? 0,
                          lon: p.lon ?? 0,
                          tags: {},
                          cuisine: p.cuisine ?? undefined,
                        } as PlaceCard)
                        onClose()
                        router.push(
                          `/?select=${encodeURIComponent(p.osm_id)}` +
                            (p.lat != null && p.lon != null ? `&lat=${p.lat}&lon=${p.lon}` : '')
                        )
                      }}
                      style={{
                        width: 240,
                        maxWidth: '100%',
                        padding: 0,
                        border: mine ? 'none' : '1px solid var(--b2)',
                        borderRadius: 16,
                        overflow: 'hidden',
                        background: 'var(--white)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: 'var(--s1)',
                      }}
                    >
                      <div
                        style={{
                          height: 116,
                          background: (m.payload as MessagePlacePayload).photo
                            ? `url("${(m.payload as MessagePlacePayload).photo}") center/cover`
                            : 'var(--surface-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-3)',
                        }}
                      >
                        {!(m.payload as MessagePlacePayload).photo && (
                          <MapPin size={26} strokeWidth={1.6} />
                        )}
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 600,
                            fontSize: 15,
                            color: 'var(--ink)',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {(m.payload as MessagePlacePayload).name}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 2,
                            fontSize: 12,
                            color: 'var(--accent-text)',
                            fontWeight: 600,
                          }}
                        >
                          <MapPin size={12} />
                          {(m.payload as MessagePlacePayload).cuisine
                            ? frCuisine((m.payload as MessagePlacePayload).cuisine!)
                            : 'Voir sur la carte'}
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div
                      style={{
                        padding: '9px 13px',
                        borderRadius: 16,
                        background: mine ? 'var(--accent)' : 'var(--white)',
                        color: mine ? '#fff' : 'var(--ink)',
                        border: mine ? 'none' : '1px solid var(--b2)',
                        fontSize: 14.5,
                        lineHeight: 1.35,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {m.content}
                    </div>
                  )}
                  <span
                    style={{
                      fontSize: 10.5,
                      color: 'var(--text-3)',
                      margin: '3px 4px 0',
                    }}
                  >
                    {formatTime(d)}
                    {m.edited_at && !m.deleted_at ? ' · modifié' : ''}
                    {mine && isLastMine && m.read_at ? ' · Vu' : ''}
                  </span>
                  {/* Réactions */}
                  {m.reactions && m.reactions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
                      {m.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          onClick={() => react(m.id, r.emoji)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '2px 7px',
                            borderRadius: 999,
                            border: `1px solid ${r.mine ? 'var(--accent)' : 'var(--b2)'}`,
                            background: r.mine ? 'var(--accent-light)' : 'var(--white)',
                            color: 'var(--ink)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {r.emoji} {r.count}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Fragment>
            )
          })
        })()}
        <div ref={endRef} />
      </div>

      {sendError && (
        <p
          style={{
            margin: 0,
            padding: '6px 14px',
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--coral)',
            background: 'var(--coral-pale)',
            textAlign: 'center',
          }}
        >
          Message non envoyé. Réessaie.
        </p>
      )}

      {/* Bandeau d'édition */}
      {editing && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: 'var(--accent-light)',
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--accent-text)',
          }}
        >
          <span style={{ flex: 1 }}>Modification du message</span>
          <button
            onClick={() => {
              setEditing(null)
              setText('')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Aperçu de réponse */}
      {replyTo && !editing && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            background: 'var(--surface-2)',
            borderLeft: '3px solid var(--accent)',
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--accent-text)',
              }}
            >
              Réponse à {replyTo.sender_id === myId ? 'toi' : user.display_name}
            </span>
            <span
              style={{
                display: 'block',
                fontSize: 12.5,
                color: 'var(--text-2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {replyTo.deleted_at
                ? 'Message supprimé'
                : replyTo.type === 'place'
                  ? `📍 ${(replyTo.payload as MessagePlacePayload)?.name ?? 'Lieu'}`
                  : replyTo.type === 'poll'
                    ? `🗳️ ${(replyTo.payload as MessagePollPayload)?.title ?? 'Sondage'}`
                    : replyTo.content}
            </span>
          </span>
          <button
            onClick={() => setReplyTo(null)}
            aria-label="Annuler la réponse"
            style={{
              flexShrink: 0,
              background: 'none',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} strokeWidth={2.25} />
          </button>
        </div>
      )}

      {/* Composer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          padding: '10px 12px calc(var(--safe-bottom) + 10px)',
          borderTop: '1px solid var(--b2)',
          background: 'var(--white)',
        }}
      >
        <textarea
          className="input-field"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            broadcastTyping()
          }}
          placeholder="Écris un message…"
          rows={1}
          aria-label="Message"
          style={{ flex: 1, resize: 'none', maxHeight: 120 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
        />
        <button
          className="btn-primary"
          onClick={onSend}
          disabled={!text.trim() || sending}
          aria-label="Envoyer"
          style={{ width: 'auto', padding: '10px 14px', flexShrink: 0 }}
        >
          <Send size={17} />
        </button>
      </div>

      {/* Profil public de l'ami */}
      {viewProfile && (
        <PublicProfile username={user.username} overlay onBack={() => setViewProfile(false)} />
      )}

      {/* Feuille d'actions (long-press sur un message) */}
      {menuFor && (
        <div
          onClick={() => setMenuFor(null)}
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
              animation: 'slideUp 200ms cubic-bezier(0.16,1,0.3,1) backwards',
            }}
          >
            {/* Réactions rapides */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                padding: '6px 4px 10px',
                borderBottom: '1px solid var(--b1)',
                marginBottom: 4,
              }}
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    react(menuFor.id, emoji)
                    setMenuFor(null)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 28,
                    cursor: 'pointer',
                    padding: 4,
                    lineHeight: 1,
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <SheetBtn
              onClick={() => {
                setReplyTo(menuFor)
                setMenuFor(null)
              }}
            >
              Répondre
            </SheetBtn>
            {menuFor.sender_id === myId && menuFor.type !== 'place' && menuFor.type !== 'poll' && (
              <SheetBtn
                onClick={() => {
                  setEditing(menuFor)
                  setText(menuFor.content)
                  setMenuFor(null)
                }}
              >
                Modifier
              </SheetBtn>
            )}
            {menuFor.type !== 'place' && menuFor.type !== 'poll' && !!menuFor.content && (
              <SheetBtn
                onClick={() => {
                  navigator.clipboard?.writeText(menuFor.content)
                  setMenuFor(null)
                }}
              >
                Copier le texte
              </SheetBtn>
            )}
            {menuFor.sender_id === myId && (
              <SheetBtn
                danger
                onClick={() => {
                  const t = menuFor
                  setMenuFor(null)
                  removeMsg(t.id)
                }}
              >
                Supprimer le message
              </SheetBtn>
            )}
            <SheetBtn onClick={() => setMenuFor(null)}>Annuler</SheetBtn>
          </div>
        </div>
      )}

      {openPoll && <PublicPoll id={openPoll} onClose={() => setOpenPoll(null)} />}
    </div>
  )

  // Portal to <body>. A full-screen overlay must not depend on its ancestors
  // staying free of stacking contexts: any `opacity`/`transform` animation on a
  // wrapper above it silently clamps this z-index and slides the whole sheet
  // under the tab bar. Rendering at the body level makes that impossible.
  if (typeof document === 'undefined') return null
  return createPortal(sheet, document.body)
}

function SheetBtn({
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
