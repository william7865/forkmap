'use client'
import { useEffect, useRef, useState } from 'react'
import { Search, UserPlus, Check, X, Clock } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import { useFriends } from '@/lib/hooks/useFriends'
import type { UserSearchResult } from '@/types'

export default function FriendsView() {
  const { friends, requests, loading, search, sendRequest, accept, decline, removeFriend } =
    useFriends()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gen = useRef(0)

  useEffect(
    () => () => {
      gen.current++
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

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
    <div style={{ marginTop: 24 }}>
      {/* Recherche */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search
          size={17}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-3)',
          }}
        />
        <input
          className="input-field"
          type="text"
          autoCapitalize="none"
          placeholder="Rechercher un ami (@pseudo)"
          value={q}
          onChange={(e) => onQuery(e.target.value)}
          aria-label="Rechercher un ami"
          style={{ paddingLeft: 36 }}
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
            >
              {u.status === 'none' && (
                <ActionBtn
                  onClick={() => sendRequest(u.id)}
                  icon={<UserPlus size={15} />}
                  label="Ajouter"
                />
              )}
              {u.status === 'pending_sent' && <Tag icon={<Clock size={13} />} label="Envoyée" />}
              {u.status === 'pending_received' && (
                <ActionBtn
                  onClick={() => accept(u.id)}
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
            >
              <Tag icon={<Clock size={13} />} label="En attente" />
            </PersonRow>
          ))}
        </Section>
      )}

      {/* Mes amis */}
      <Section title={`Mes amis${friends.length ? ` · ${friends.length}` : ''}`}>
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
          >
            <IconBtn onClick={() => removeFriend(p.id)} aria-label="Retirer">
              <X size={16} />
            </IconBtn>
          </PersonRow>
        ))}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <p
        style={{
          margin: '0 0 8px 4px',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: 'var(--text-2)',
        }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

function PersonRow({
  name,
  username,
  src,
  id,
  children,
}: {
  name: string
  username: string
  src: string | null
  id: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        marginBottom: 8,
        background: 'var(--white)',
        border: '1px solid var(--b2)',
        borderRadius: 'var(--r-md)',
      }}
    >
      <Avatar name={name} src={src} id={id} size={42} />
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
        <span style={{ color: 'var(--text-3)', fontSize: 12.5 }}>@{username}</span>
      </span>
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
