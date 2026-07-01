'use client'
import { useEffect, useRef, useState } from 'react'
import { Search, UserPlus, Check, X, Clock, ChevronLeft } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import PublicProfile from '@/components/social/PublicProfile'
import { useFriends } from '@/lib/hooks/useFriends'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import type { UserSearchResult, FriendSuggestion } from '@/types'

export default function FriendsView({ onClose }: { onClose?: () => void }) {
  const { friends, requests, loading, search, sendRequest, accept, decline } = useFriends()
  const [viewing, setViewing] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gen = useRef(0)

  // « Personnes que tu connais peut-être » (amis d'amis).
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/friends/suggestions', { headers: await getAuthHeaders() })
        if (alive && res.ok) setSuggestions(((await res.json()).data ?? []) as FriendSuggestion[])
      } catch {
        /* noop */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(
    () => () => {
      gen.current++
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  // Optimistically reflect an action on the matching search-result row so its
  // button doesn't keep showing "Ajouter"/"Accepter" until the user retypes.
  const patchResult = (id: string, status: UserSearchResult['status']) =>
    setResults((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))

  const onQuery = (v: string) => {
    setQ(v)
    if (timer.current) clearTimeout(timer.current)
    if (v.trim().length < 2) {
      gen.current++
      setResults([])
      setSearching(false)
      return
    }
    const g = ++gen.current
    setSearching(true)
    timer.current = setTimeout(async () => {
      const r = await search(v)
      if (gen.current !== g) return
      setResults(r)
      setSearching(false)
    }, 350)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        background: 'var(--bg)',
        overflowY: 'auto',
        padding: 'calc(var(--safe-top) + 14px) 18px calc(var(--safe-bottom) + 40px)',
        animation: 'slideUp 240ms cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      {/* En-tête overlay « Ajouter des amis » */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button
          onClick={onClose}
          aria-label="Retour"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', padding: 0 }}
        >
          <ChevronLeft size={26} />
        </button>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          Amis
        </h1>
      </div>

      {/* Recherche */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-3)',
          }}
        />
        <input
          className="input-field"
          type="text"
          autoCapitalize="none"
          placeholder="Rechercher un pseudo…"
          value={q}
          onChange={(e) => onQuery(e.target.value)}
          aria-label="Rechercher un ami"
          style={{
            paddingLeft: 42,
            height: 52,
            borderRadius: 999,
            background: 'var(--surface-2)',
            border: 'none',
          }}
        />
      </div>

      {/* Résultats de recherche */}
      {q.trim().length >= 2 && (
        <div style={{ marginBottom: 24 }}>
          {searching && <Muted>Recherche…</Muted>}
          {!searching && results.length === 0 && <Muted>Aucun utilisateur trouvé.</Muted>}
          {results.map((u) => (
            <PersonRow
              key={u.id}
              name={u.display_name}
              username={u.username}
              src={u.avatar_url}
              id={u.id}
              onOpen={() => setViewing(u.username)}
            >
              {u.status === 'none' && (
                <ActionBtn
                  onClick={() => {
                    patchResult(u.id, 'pending_sent')
                    sendRequest(u.id)
                  }}
                  icon={<UserPlus size={15} />}
                  label="Ajouter"
                />
              )}
              {u.status === 'pending_sent' && <Tag icon={<Clock size={13} />} label="Envoyée" />}
              {u.status === 'pending_received' && (
                <ActionBtn
                  onClick={() => {
                    patchResult(u.id, 'friends')
                    accept(u.id)
                  }}
                  icon={<Check size={15} />}
                  label="Accepter"
                  primary
                />
              )}
              {u.status === 'friends' && <Tag icon={<Check size={13} />} label="Amis" />}
            </PersonRow>
          ))}
        </div>
      )}

      {/* Demandes reçues */}
      {requests.received.length > 0 && (
        <Section title="Demandes reçues">
          {requests.received.map((p) => (
            <PersonRow
              key={p.id}
              name={p.display_name}
              username={p.username}
              src={p.avatar_url}
              id={p.id}
              onOpen={() => setViewing(p.username)}
            >
              <ActionBtn
                onClick={() => accept(p.id)}
                icon={<Check size={15} />}
                label="Accepter"
                primary
              />
              <IconBtn onClick={() => decline(p.id)} aria-label="Refuser">
                <X size={16} />
              </IconBtn>
            </PersonRow>
          ))}
        </Section>
      )}

      {/* Demandes envoyées */}
      {requests.sent.length > 0 && (
        <Section title="Demandes envoyées">
          {requests.sent.map((p) => (
            <PersonRow
              key={p.id}
              name={p.display_name}
              username={p.username}
              src={p.avatar_url}
              id={p.id}
              onOpen={() => setViewing(p.username)}
            >
              <Tag icon={<Clock size={13} />} label="En attente" />
            </PersonRow>
          ))}
        </Section>
      )}

      {/* Mes amis */}
      <Section title={`Amis${friends.length ? ` (${friends.length})` : ''}`}>
        {loading && <Muted>Chargement…</Muted>}
        {!loading && friends.length === 0 && (
          <Muted>Aucun ami pour l&apos;instant. Cherche un @pseudo pour commencer.</Muted>
        )}
        {friends.map((p) => (
          <PersonRow
            key={p.id}
            name={p.display_name}
            username={p.username}
            src={p.avatar_url}
            id={p.id}
            onOpen={() => setViewing(p.username)}
          >
            <Tag icon={<Check size={13} />} label="Ami" />
          </PersonRow>
        ))}
      </Section>

      {/* Suggestions — personnes que tu connais peut-être (amis d'amis) */}
      {q.trim().length < 2 && suggestions.length > 0 && (
        <Section title="Personnes que tu connais peut-être">
          {suggestions.map((s) => (
            <PersonRow
              key={s.id}
              name={s.display_name}
              username={s.username}
              src={s.avatar_url}
              id={s.id}
              subtitle={`${s.mutuals} ami${s.mutuals > 1 ? 's' : ''} en commun`}
              onOpen={() => setViewing(s.username)}
            >
              <ActionBtn
                onClick={() => {
                  setSuggestions((list) => list.filter((x) => x.id !== s.id))
                  sendRequest(s.id)
                }}
                icon={<UserPlus size={15} />}
                label="Ajouter"
              />
            </PersonRow>
          ))}
        </Section>
      )}

      {/* Profil public en overlay (évite le routage dynamique en export statique) */}
      {viewing && <PublicProfile username={viewing} overlay onBack={() => setViewing(null)} />}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 26 }}>
      <h2
        style={{
          margin: '0 0 12px 2px',
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: 'var(--text)',
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function PersonRow({
  name,
  username,
  src,
  id,
  onOpen,
  children,
  subtitle,
}: {
  name: string
  username: string
  src: string | null
  id: string
  onOpen: () => void
  children: React.ReactNode
  subtitle?: string
}) {
  return (
    <div
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
      {/* Avatar + nom : zone cliquable vers le profil */}
      <button
        onClick={onOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
        }}
      >
        <Avatar name={name} src={src} id={id} size={52} />
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <strong
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--ink)',
            }}
          >
            {name}
          </strong>
          <span style={{ color: 'var(--text-3)', fontSize: 12.5 }}>{subtitle ?? `@${username}`}</span>
        </span>
      </button>
      {/* Boutons d'action : hors de la zone de navigation */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {children}
      </span>
    </div>
  )
}

function ActionBtn({
  onClick,
  icon,
  label,
  primary,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '7px 12px',
        borderRadius: 'var(--r-md)',
        border: primary ? 'none' : '1px solid var(--b2)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 700,
        background: primary ? 'var(--accent)' : 'var(--white)',
        color: primary ? '#fff' : 'var(--ink)',
      }}
    >
      {icon} {label}
    </button>
  )
}

function IconBtn({
  onClick,
  children,
  ...rest
}: { onClick: () => void; children: React.ReactNode } & React.ComponentProps<'button'>) {
  return (
    <button
      onClick={onClick}
      {...rest}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--b2)',
        background: 'var(--white)',
        cursor: 'pointer',
        color: 'var(--text-2)',
      }}
    >
      {children}
    </button>
  )
}

function Tag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 10px',
        borderRadius: 'var(--r-md)',
        background: 'var(--bone)',
        color: 'var(--text-2)',
        fontSize: 12.5,
        fontWeight: 600,
      }}
    >
      {icon} {label}
    </span>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '4px 4px', fontSize: 13.5, color: 'var(--text-3)' }}>{children}</p>
}
