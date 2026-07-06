'use client'
// SharePollSheet — send a poll to one or several friends inside the app.
// Mirrors SendToFriendSheet: tap a friend to drop the poll into their DM as a
// "poll" message card. Reuses the friends + messaging infrastructure.
import { useState } from 'react'
import { ChevronLeft, Check, Send } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import { useFriends } from '@/lib/hooks/useFriends'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'

export default function SharePollSheet({
  pollId,
  title,
  onClose,
}: {
  pollId: string
  title: string
  onClose: () => void
}) {
  const { friends, loading } = useFriends()
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sendTo = async (userId: string) => {
    if (busy || sentTo.has(userId)) return
    setBusy(userId)
    setError(null)
    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({
          toUserId: userId,
          content: `🗳️ ${title}`,
          type: 'poll',
          payload: { poll_id: pollId, title },
        }),
      })
      if (res.ok) {
        setSentTo((s) => new Set(s).add(userId))
      } else {
        const j = await res.json().catch(() => null)
        setError(j?.error ?? "Impossible d'envoyer le sondage.")
      }
    } catch {
      setError('Connexion impossible. Réessaie.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100002,
        background: 'var(--bg)',
        overflowY: 'auto',
        padding: 'calc(var(--safe-top) + 14px) 18px calc(var(--safe-bottom) + 40px)',
        animation: 'slideUp 240ms cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
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
            fontSize: 24,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          Partager à…
        </h1>
      </div>
      <p style={{ margin: '0 0 18px 2px', fontSize: 13.5, color: 'var(--text-2)' }}>
        Envoie le sondage <strong style={{ color: 'var(--text)' }}>{title}</strong> à tes amis.
      </p>

      {error && (
        <p
          style={{
            margin: '0 0 14px 2px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--coral)',
          }}
        >
          {error}
        </p>
      )}

      {loading && <p style={{ color: 'var(--text-3)', fontSize: 13.5 }}>Chargement…</p>}
      {!loading && friends.length === 0 && (
        <p style={{ color: 'var(--text-3)', fontSize: 13.5 }}>
          Ajoute des amis pour leur partager ton sondage.
        </p>
      )}

      {friends.map((f) => {
        const sent = sentTo.has(f.id)
        return (
          <div
            key={f.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 14px',
              marginBottom: 10,
              background: 'var(--white)',
              border: '1px solid var(--b2)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--s1)',
            }}
          >
            <Avatar name={f.display_name} src={f.avatar_url} id={f.id} size={48} />
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: 15, color: 'var(--ink)' }}>{f.display_name}</strong>
              <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>@{f.username}</span>
            </span>
            <button
              onClick={() => sendTo(f.id)}
              disabled={sent || busy === f.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 'var(--r-pill)',
                border: 'none',
                cursor: sent ? 'default' : 'pointer',
                background: sent ? 'var(--surface-2)' : 'var(--accent)',
                color: sent ? 'var(--text-2)' : '#fff',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
              }}
            >
              {sent ? (
                <>
                  <Check size={15} /> Envoyé
                </>
              ) : (
                <>
                  <Send size={15} /> Envoyer
                </>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
