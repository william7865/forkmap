'use client'
import { useState } from 'react'
import { UserPlus, Check, Clock, UserMinus } from 'lucide-react'
import { useFriends } from '@/lib/hooks/useFriends'
import type { FriendshipStatus } from '@/types'

export default function FriendButton({
  userId,
  status: initial,
  onChange,
}: {
  userId: string
  status: FriendshipStatus
  onChange?: (s: FriendshipStatus) => void
}) {
  const { sendRequest, accept, removeFriend } = useFriends()
  const [status, setStatus] = useState<FriendshipStatus>(initial)
  const [busy, setBusy] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const set = (s: FriendshipStatus) => {
    setStatus(s)
    onChange?.(s)
  }

  const onAdd = async () => {
    setBusy(true)
    set('pending_sent')
    try {
      await sendRequest(userId)
    } catch {
      set('none') // revert on failure
    } finally {
      setBusy(false)
    }
  }
  const onAccept = async () => {
    setBusy(true)
    set('friends')
    try {
      await accept(userId)
    } catch {
      set('pending_received') // revert on failure
    } finally {
      setBusy(false)
    }
  }

  const onRemove = async () => {
    setBusy(true)
    set('none')
    setConfirmRemove(false)
    try {
      await removeFriend(userId)
    } catch {
      set('friends') // revert on failure
    } finally {
      setBusy(false)
    }
  }

  if (status === 'friends') {
    // Pastille « Amis » → 1er tap demande confirmation, 2e tap retire l'ami.
    return confirmRemove ? (
      <button
        disabled={busy}
        onClick={onRemove}
        onBlur={() => setConfirmRemove(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '9px 16px',
          borderRadius: 'var(--r-pill)',
          border: '1px solid var(--closed)',
          background: 'var(--closed-bg)',
          color: 'var(--closed)',
          fontSize: 13.5,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <UserMinus size={15} /> Retirer l&apos;ami
      </button>
    ) : (
      <button
        onClick={() => setConfirmRemove(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '9px 16px',
          borderRadius: 'var(--r-pill)',
          border: 'none',
          background: 'var(--bone)',
          color: 'var(--text-2)',
          fontSize: 13.5,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <Check size={15} /> Amis
      </button>
    )
  }
  if (status === 'pending_sent') return <Pill icon={<Clock size={14} />} label="Demande envoyée" />
  if (status === 'pending_received')
    return (
      <button
        className="btn-primary"
        disabled={busy}
        onClick={onAccept}
        style={{ width: 'auto', padding: '10px 18px' }}
      >
        Accepter la demande
      </button>
    )
  return (
    <button
      className="btn-primary"
      disabled={busy}
      onClick={onAdd}
      style={{ width: 'auto', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <UserPlus size={16} /> Ajouter en ami
    </button>
  )
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '9px 16px',
        borderRadius: 'var(--r-pill)',
        background: 'var(--bone)',
        color: 'var(--text-2)',
        fontSize: 13.5,
        fontWeight: 700,
      }}
    >
      {icon} {label}
    </span>
  )
}
