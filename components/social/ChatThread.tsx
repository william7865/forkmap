'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Send } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import { useAuth } from '@/lib/hooks/useAuth'
import { useChatThread } from '@/lib/hooks/useChatThread'

export default function ChatThread({
  user,
  onClose,
}: {
  user: { id: string; display_name: string; username: string; avatar_url: string | null }
  onClose: () => void
}) {
  const auth = useAuth()
  const myId = auth.user?.id ?? ''
  const { messages, loading, send, sending } = useChatThread(user.id, myId)
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const onSend = () => {
    const t = text.trim()
    if (!t) return
    setText('')
    void send(t)
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
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>@{user.username}</span>
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
        {messages.map((m) => {
          const mine = m.sender_id === myId
          return (
            <div
              key={m.id}
              style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}
            >
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
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

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
          onChange={(e) => setText(e.target.value)}
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
