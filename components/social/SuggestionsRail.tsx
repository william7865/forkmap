'use client'
// SuggestionsRail — « Personnes que tu connais peut-être » en rail horizontal
// dans Découvrir (amis d'amis, /api/friends/suggestions). Colonnes avatar
// sans cartes : le monochrome privilégie le blanc et les filets. Se retire
// tout seul quand il n'y a aucune suggestion.
import { useEffect, useState } from 'react'
import { UserPlus, Check } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import PublicProfile from '@/components/social/PublicProfile'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { staggerDelay } from '@/lib/motion'
import type { FriendSuggestion } from '@/types'

export default function SuggestionsRail({ onOpenAll }: { onOpenAll?: () => void }) {
  const [people, setPeople] = useState<FriendSuggestion[]>([])
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [viewing, setViewing] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/friends/suggestions', { headers: await getAuthHeaders() })
        if (alive && res.ok) {
          setPeople((((await res.json()).data ?? []) as FriendSuggestion[]).slice(0, 8))
        }
      } catch {
        /* noop */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const add = async (id: string) => {
    setSent((s) => new Set(s).add(id))
    try {
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
      const res = await apiFetch('/api/friends', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: id }),
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      setSent((s) => {
        const next = new Set(s)
        next.delete(id)
        return next
      })
    }
  }

  if (people.length === 0) return null

  return (
    <div style={{ padding: '2px 0 14px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '0 20px',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--text)',
          }}
        >
          Élargis ton cercle
        </span>
        {onOpenAll && (
          <button
            onClick={onOpenAll}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-3)',
              padding: 0,
            }}
          >
            Tout voir ›
          </button>
        )}
      </div>

      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: 18,
          overflowX: 'auto',
          padding: '10px 20px 2px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {people.map((p, i) => {
          const requested = sent.has(p.id)
          return (
            <div
              key={p.id}
              className="anim-fade-up"
              style={{
                animationDelay: staggerDelay(i),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 108,
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setViewing(p.username)}
                className="tap-press"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  width: '100%',
                }}
              >
                <Avatar name={p.display_name} src={p.avatar_url} id={p.id} size={64} />
                <span style={{ display: 'block', width: '100%', textAlign: 'center' }}>
                  <span
                    className="truncate-1"
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: 14.5,
                      letterSpacing: '-0.01em',
                      color: 'var(--text)',
                    }}
                  >
                    {p.display_name}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 11.5,
                      color: 'var(--text-3)',
                      marginTop: 1,
                    }}
                  >
                    {p.mutuals > 0
                      ? `${p.mutuals} ami${p.mutuals > 1 ? 's' : ''} en commun`
                      : `@${p.username}`}
                  </span>
                </span>
              </button>
              <button
                onClick={() => add(p.id)}
                disabled={requested}
                aria-label={requested ? 'Demande envoyée' : `Ajouter ${p.display_name}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  marginTop: 8,
                  height: 30,
                  padding: '0 13px',
                  borderRadius: 999,
                  border: requested ? '1px solid var(--border)' : 'none',
                  background: requested ? 'var(--bg)' : 'var(--accent)',
                  color: requested ? 'var(--text-3)' : 'var(--on-accent)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: requested ? 'default' : 'pointer',
                  transition: 'background 140ms, color 140ms',
                }}
              >
                {requested ? <Check size={13} /> : <UserPlus size={13} />}
                {requested ? 'Envoyée' : 'Ajouter'}
              </button>
            </div>
          )
        })}
      </div>

      {viewing && <PublicProfile username={viewing} overlay onBack={() => setViewing(null)} />}
    </div>
  )
}
