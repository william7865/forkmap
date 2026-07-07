'use client'
// FollowButton — unilateral follow (tastemakers). Optimistic; mirrors the
// FriendButton visual language (pill, shared tokens).
import { useState } from 'react'
import { UserPlus, Check } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'

export default function FollowButton({
  userId,
  initialFollowing,
  onChange,
}: {
  userId: string
  initialFollowing: boolean
  onChange?: (following: boolean) => void
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    if (busy) return
    setBusy(true)
    const next = !following
    setFollowing(next)
    onChange?.(next)
    try {
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
      const res = next
        ? await apiFetch('/api/follows', {
            method: 'POST',
            headers,
            body: JSON.stringify({ followee_id: userId }),
          })
        : await apiFetch(`/api/follows?followee_id=${encodeURIComponent(userId)}`, {
            method: 'DELETE',
            headers,
          })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      setFollowing(!next) // revert on failure
      onChange?.(!next)
    } finally {
      setBusy(false)
    }
  }

  return following ? (
    <button
      onClick={toggle}
      disabled={busy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '9px 16px',
        borderRadius: 'var(--r-pill)',
        border: '1px solid var(--b2)',
        background: 'var(--bone)',
        color: 'var(--text-2)',
        fontSize: 13.5,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      <Check size={15} /> Suivi
    </button>
  ) : (
    <button
      onClick={toggle}
      disabled={busy}
      className="btn-primary"
      style={{ width: 'auto', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <UserPlus size={16} /> Suivre
    </button>
  )
}
