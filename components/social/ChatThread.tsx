'use client'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Send, MapPin } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import { useAuth, getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { useChatThread } from '@/lib/hooks/useChatThread'
import { frCuisine } from '@/lib/cuisine'
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
  const { messages, loading, send, sending } = useChatThread(user.id, myId)
  const [text, setText] = useState('')
  const [sendError, setSendError] = useState(false)
  const [otherOnline, setOtherOnline] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const chanRef = useRef<RealtimeChannel | null>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSent = useRef(0)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  // Présence en ligne + indicateur « écrit… » (Realtime, canal par paire).
  useEffect(() => {
    if (!myId) return
    const sb = getSupabaseBrowserClient()
    const key = [myId, user.id].sort().join(':')
    const ch = sb.channel(`chat-rt:${key}`, { config: { presence: { key: myId } } })
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, unknown>
      setOtherOnline(Object.keys(state).includes(user.id))
    })
      .on('broadcast', { event: 'typing' }, (msg: { payload?: { from?: string } }) => {
        if (msg.payload?.from !== user.id) return
        setOtherTyping(true)
        if (typingTimer.current) clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setOtherTyping(false), 2500)
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') ch.track({ user_id: myId })
      })
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
    setText('')
    setSendError(false)
    const ok = await send(t)
    if (!ok) {
      setText(t) // restaure le message pour que l'utilisateur puisse réessayer
      setSendError(true)
    }
  }

  return (
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
        <Avatar name={user.display_name} src={user.avatar_url} id={user.id} size={36} />
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <strong
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 15,
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
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '78%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: mine ? 'flex-end' : 'flex-start',
                  }}
                >
                  {m.type === 'place' && m.payload ? (
                    <button
                      onClick={() => {
                        const p = m.payload!
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
                          background: m.payload.photo
                            ? `url("${m.payload.photo}") center/cover`
                            : 'var(--surface-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-3)',
                        }}
                      >
                        {!m.payload.photo && <MapPin size={26} strokeWidth={1.6} />}
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: 15,
                            color: 'var(--ink)',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {m.payload.name}
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
                          {m.payload.cuisine ? frCuisine(m.payload.cuisine) : 'Voir sur la carte'}
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
                    {mine && isLastMine && m.read_at ? ' · Vu' : ''}
                  </span>
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
    </div>
  )
}
