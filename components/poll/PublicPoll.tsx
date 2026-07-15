'use client'
// PublicPoll — the shareable, no-login poll page rendered at /sondage/[id].
// Anyone with the link can vote; the creator (if logged in) can close the poll.
//
// Voter identity comes from a signed httpOnly cookie the server issues, so it
// cannot be forged. Only the native WebView still sends a locally generated
// token: it calls the API cross-origin, where the cookie is not attached.
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Star, Check, Trophy, X } from 'lucide-react'
import type { PollPublic } from '@/types'
import { apiFetch } from '@/lib/api'
import { useIsNative } from '@/lib/native/platform'
import { getVoterToken, getVoterName, setVoterName } from '@/lib/poll-token'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { getAuthHeaders } from '@/lib/auth-headers'
import { frCuisine } from '@/lib/cuisine'
import PlaceThumb from '@/components/place/PlaceThumb'

/**
 * Renders a poll. Used two ways:
 *  - as the /sondage/[id] route page (reads the id from the URL), and
 *  - as an in-app overlay when opened from a shared DM card (`id` + `onClose`).
 */
export default function PublicPoll({ id: idProp, onClose }: { id?: string; onClose?: () => void }) {
  const params = useParams<{ id: string }>()
  const id = idProp ?? params?.id ?? ''
  const isNative = useIsNative()

  const [poll, setPoll] = useState<PollPublic | null>(null)
  const [myVote, setMyVote] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound'>('loading')
  const [voting, setVoting] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id || id === '__placeholder__') {
      setStatus('notfound')
      return
    }
    try {
      // On the web the server reads its own cookie; sending a client token here
      // would override it and it would never issue one. Native has no cookie.
      const qs = isNative ? `?token=${encodeURIComponent(getVoterToken())}` : ''
      // Send the auth token when logged in so the server can flag isOwner
      // (it never returns the owner's user id to anonymous viewers).
      const res = await apiFetch(`/api/polls/${id}${qs}`, {
        headers: await getAuthHeaders(),
      })
      if (res.status === 404) {
        setStatus('notfound')
        return
      }
      const { data } = await res.json()
      setPoll(data.poll)
      setMyVote(data.myVote)
      setStatus('ready')
    } catch {
      setStatus('notfound')
    }
  }, [id, isNative])

  useEffect(() => {
    setName(getVoterName())
    load()
  }, [load])

  const vote = async (optionId: string) => {
    if (!poll || poll.closed) return
    setVoting(optionId)
    try {
      const trimmed = name.trim()
      if (trimmed) setVoterName(trimmed)
      const res = await apiFetch(`/api/polls/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optionId,
          ...(isNative ? { voterToken: getVoterToken() } : {}),
          voterName: trimmed || null,
        }),
      })
      if (res.ok) {
        setMyVote(optionId)
        await load()
      }
    } finally {
      setVoting(null)
    }
  }

  const close = async () => {
    try {
      const sb = getSupabaseBrowserClient()
      const {
        data: { session },
      } = await sb.auth.getSession()
      const res = await apiFetch(`/api/polls/${id}/close`, {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (res.ok) await load()
    } catch {
      /* ignore */
    }
  }

  if (status === 'loading') {
    return <Centered>Chargement…</Centered>
  }
  if (status === 'notfound' || !poll) {
    return <Centered>Ce sondage n&apos;existe pas ou a été supprimé.</Centered>
  }

  const { results } = poll
  const pctById = new Map(results.tallies.map((t) => [t.optionId, t]))

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: 'calc(var(--safe-top, 0px) + 28px) 18px calc(var(--safe-bottom, 0px) + 40px)',
        ...(onClose
          ? { position: 'fixed', inset: 0, zIndex: 1600, overflowY: 'auto' as const }
          : {}),
      }}
    >
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute',
            top: 'calc(var(--safe-top, 0px) + 14px)',
            right: 16,
            background: 'var(--white)',
            border: '1px solid var(--b2)',
            borderRadius: 999,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--ink)',
            boxShadow: 'var(--s1)',
          }}
        >
          <X size={19} />
        </button>
      )}
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: 'var(--text-3)',
            marginBottom: 12,
          }}
        >
          Sondage Forkmap
        </div>
        <h1
          style={{
            margin: '0 0 8px',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 31,
            lineHeight: 1.08,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
          }}
        >
          {poll.title}
        </h1>
        <div style={{ fontSize: 13.5, color: 'var(--text-3)', marginBottom: 24 }}>
          {results.total} vote{results.total > 1 ? 's' : ''}
          {poll.closed && ' · Clôturé'}
        </div>

        {!poll.closed && (
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Ton prénom (optionnel)"
            style={{ marginBottom: 18 }}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {poll.options.map((o) => {
            const t = pctById.get(o.id)
            const pct = t?.pct ?? 0
            const votes = t?.votes ?? 0
            const mine = myVote === o.id
            const won = poll.closed && results.winnerId === o.id
            const c = o.place.cuisine ?? o.place.fsq?.categories?.[0]?.name
            return (
              <button
                key={o.id}
                onClick={() => vote(o.id)}
                disabled={poll.closed || voting !== null}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  width: '100%',
                  padding: 11,
                  borderRadius: 15,
                  border: mine ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: 'var(--bg)',
                  cursor: poll.closed ? 'default' : 'pointer',
                  overflow: 'hidden',
                  textAlign: 'left',
                }}
              >
                {/* Result fill */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${pct}%`,
                    background: won ? 'var(--star-soft, rgba(245,166,35,0.14))' : 'var(--surface)',
                    transition: 'width 260ms ease',
                    zIndex: 0,
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: 'var(--s1)',
                  }}
                >
                  <PlaceThumb place={o.place} initialSize={22} />
                </div>
                <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {won && <Trophy size={15} color="var(--star)" fill="var(--star)" />}
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        fontSize: 16.5,
                        letterSpacing: '-0.01em',
                        color: 'var(--text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {o.place.name}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      marginTop: 4,
                      fontSize: 12.5,
                      color: 'var(--text-2)',
                    }}
                  >
                    {o.place.fsq?.rating != null && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          fontWeight: 700,
                          fontSize: 11.5,
                          color: 'var(--text)',
                        }}
                      >
                        <Star size={11} strokeWidth={0} fill="var(--star)" />
                        {o.place.fsq.rating.toFixed(1)}
                      </span>
                    )}
                    {c && <span>{frCuisine(c)}</span>}
                  </div>
                </div>
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'right',
                    flexShrink: 0,
                    minWidth: 44,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: 17,
                      color: 'var(--text)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {pct}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{votes} voix</div>
                </div>
                {mine && (
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} color="var(--white)" strokeWidth={3} />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {!poll.closed && myVote && (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', marginTop: 14 }}>
            Ton vote est enregistré — tu peux le changer à tout moment.
          </div>
        )}

        {poll.isOwner && !poll.closed && (
          <button
            onClick={close}
            style={{
              display: 'block',
              margin: '22px auto 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--coral)',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'inherit',
              padding: 10,
            }}
          >
            Clôturer le sondage
          </button>
        )}
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        color: 'var(--text-3)',
        fontSize: 15,
      }}
    >
      {children}
    </div>
  )
}
