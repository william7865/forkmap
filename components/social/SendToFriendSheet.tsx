'use client'
// Envoyer une fiche resto OU un sondage à un ami — bottom sheet (pattern
// partage Instagram) : grabber, recherche, lignes avatar + pilule
// « Envoyer » → « Envoyé ✓ ». Sert aussi le partage de sondage (ex-
// SharePollSheet, fusionné ici : même picker, autre payload de message).
import { useState } from 'react'
import { Check, Search, Send } from 'lucide-react'
import { Sheet, SheetHeader } from '@/components/ui/Sheet'
import UserRow from '@/components/social/UserRow'
import { useFriends } from '@/lib/hooks/useFriends'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { successTap, errorTap } from '@/lib/native/haptics'
import type { MessagePlacePayload } from '@/types'

type Props = {
  onClose: () => void
  /** Fiche resto à partager (message de type `place`). */
  place?: MessagePlacePayload
  /** Sondage à partager (message de type `poll`). */
  poll?: { id: string; title: string }
  /** Au-dessus d'un flow qui a son propre overlay (ex. PollCreate). */
  zIndex?: number
}

export default function SendToFriendSheet({ place, poll, onClose, zIndex }: Props) {
  const { friends, loading } = useFriends()
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const subtitle = place ? `📍 ${place.name}` : poll ? `🗳️ ${poll.title}` : ''

  const sendTo = async (userId: string) => {
    if (busy || sentTo.has(userId)) return
    setBusy(userId)
    try {
      const body = place
        ? { toUserId: userId, content: `📍 ${place.name}`, type: 'place', payload: place }
        : poll
          ? {
              toUserId: userId,
              content: `🗳️ ${poll.title}`,
              type: 'poll',
              payload: { poll_id: poll.id, title: poll.title },
            }
          : null
      if (!body) return
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        successTap()
        setSentTo((s) => new Set(s).add(userId))
      } else {
        errorTap()
      }
    } catch {
      errorTap()
    } finally {
      setBusy(null)
    }
  }

  const shown = q.trim()
    ? friends.filter(
        (f) =>
          f.display_name.toLowerCase().includes(q.trim().toLowerCase()) ||
          f.username.toLowerCase().includes(q.trim().toLowerCase())
      )
    : friends

  return (
    <Sheet ariaLabel="Envoyer à un ami" onClose={onClose} zIndex={zIndex}>
      <SheetHeader title="Envoyer à un ami" subtitle={subtitle} />

      {/* Recherche */}
      {friends.length > 5 && (
        <div style={{ padding: '0 20px 10px', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              height: 42,
              padding: '0 14px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <Search size={16} strokeWidth={1.8} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher un ami"
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                color: 'var(--text)',
              }}
            />
          </div>
        </div>
      )}

      {/* Liste d'amis */}
      <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading && (
          <p
            style={{
              margin: 0,
              padding: '18px 20px',
              color: 'var(--text-3)',
              fontSize: 13.5,
              textAlign: 'center',
            }}
          >
            Chargement…
          </p>
        )}
        {!loading && friends.length === 0 && (
          <p
            style={{
              margin: 0,
              padding: '18px 20px 24px',
              color: 'var(--text-3)',
              fontSize: 13.5,
              textAlign: 'center',
            }}
          >
            {poll
              ? 'Ajoute des amis pour leur partager ton sondage.'
              : 'Ajoute des amis pour leur partager des adresses.'}
          </p>
        )}
        {!loading && friends.length > 0 && shown.length === 0 && (
          <p
            style={{
              margin: 0,
              padding: '18px 20px 24px',
              color: 'var(--text-3)',
              fontSize: 13.5,
              textAlign: 'center',
            }}
          >
            Aucun ami ne correspond.
          </p>
        )}
        {shown.map((f) => {
          const sent = sentTo.has(f.id)
          const sending = busy === f.id
          return (
            <div key={f.id} style={{ padding: '0 20px', borderTop: '1px solid var(--border)' }}>
              <UserRow
                name={f.display_name}
                username={f.username}
                src={f.avatar_url}
                id={f.id}
                size={46}
              >
                <button
                  onClick={() => sendTo(f.id)}
                  disabled={sent || sending}
                  className={sent ? undefined : 'tap-press'}
                  aria-label={sent ? `Envoyé à ${f.display_name}` : `Envoyer à ${f.display_name}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 36,
                    padding: '0 16px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: sent ? 'default' : 'pointer',
                    background: sent ? 'var(--surface-2)' : 'var(--accent)',
                    color: sent ? 'var(--text-2)' : 'var(--on-accent)',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    opacity: sending ? 0.6 : 1,
                    transition: 'background 140ms, color 140ms',
                    flexShrink: 0,
                  }}
                >
                  {sent ? (
                    <>
                      <Check size={14} /> Envoyé
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Envoyer
                    </>
                  )}
                </button>
              </UserRow>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
