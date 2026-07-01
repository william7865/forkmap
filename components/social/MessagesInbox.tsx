'use client'
import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import ChatThread from '@/components/social/ChatThread'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import type { ConversationSummary } from '@/types'

export default function MessagesInbox({ onClose }: { onClose: () => void }) {
  const [convos, setConvos] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<ConversationSummary['user'] | null>(null)

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
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1450,
        background: 'var(--bg)',
        overflowY: 'auto',
        paddingBottom: 'calc(var(--safe-bottom) + 40px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 'calc(var(--safe-top) + 10px) 14px 8px',
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
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 22,
            color: 'var(--ink)',
          }}
        >
          Messages
        </h1>
      </div>

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
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '8px 4px', fontSize: 13.5, color: 'var(--text-3)' }}>{children}</p>
}
