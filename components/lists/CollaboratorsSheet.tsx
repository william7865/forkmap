'use client'
// CollaboratorsSheet — the list owner invites/removes friends as collaborators.
// Mirrors SendToFriendSheet: reuses useFriends + the shared Avatar.
import { useEffect, useState } from 'react'
import { ChevronLeft, Check, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import { useFriends } from '@/lib/hooks/useFriends'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'

export default function CollaboratorsSheet({
  listId,
  listName,
  onClose,
  onChanged,
}: {
  listId: string
  listName: string
  onClose: () => void
  onChanged?: () => void
}) {
  const { friends, loading } = useFriends()
  const [collaborators, setCollaborators] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiFetch(`/api/lists/${listId}/collaborators`, {
          headers: await getAuthHeaders(),
        })
        if (res.ok) {
          const { data } = await res.json()
          setCollaborators(new Set((data ?? []).map((c: { id: string }) => c.id)))
        }
      } catch {
        /* noop */
      }
    })()
  }, [listId])

  const toggle = async (userId: string) => {
    if (busy) return
    setBusy(userId)
    const isCollab = collaborators.has(userId)
    try {
      const res = isCollab
        ? await apiFetch(`/api/lists/${listId}/collaborators?userId=${userId}`, {
            method: 'DELETE',
            headers: await getAuthHeaders(),
          })
        : await apiFetch(`/api/lists/${listId}/collaborators`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
            body: JSON.stringify({ friendId: userId }),
          })
      if (res.ok) {
        setCollaborators((prev) => {
          const next = new Set(prev)
          if (isCollab) next.delete(userId)
          else next.add(userId)
          return next
        })
        onChanged?.()
      }
    } catch {
      /* noop */
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1600,
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
          <ChevronLeft size={24} />
        </button>
      </div>
      <h1
        style={{
          margin: '2px 0 4px',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 24,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
        }}
      >
        Collaborateurs
      </h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-3)' }}>
        Invite des amis à enrichir « {listName} ». Ils pourront ajouter et retirer des lieux.
      </p>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
          Chargement…
        </div>
      ) : friends.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
          Ajoute des amis pour pouvoir collaborer.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {friends.map((f) => {
            const on = collaborators.has(f.id)
            return (
              <button
                key={f.id}
                onClick={() => toggle(f.id)}
                disabled={busy === f.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <Avatar name={f.display_name} src={f.avatar_url} id={f.id} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
                    {f.display_name}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>@{f.username}</div>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '7px 12px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    border: on ? 'none' : '1.5px solid var(--b2)',
                    background: on ? 'var(--accent)' : 'transparent',
                    color: on ? 'var(--white)' : 'var(--ink)',
                    flexShrink: 0,
                  }}
                >
                  {on ? (
                    <>
                      <Check size={14} strokeWidth={3} /> Membre
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> Inviter
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
