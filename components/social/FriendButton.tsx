'use client'
import { useState } from 'react'
import { UserPlus, Check, Clock } from 'lucide-react'
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
  const { sendRequest, accept } = useFriends()
  const [status, setStatus] = useState<FriendshipStatus>(initial)
  const [busy, setBusy] = useState(false)

  const set = (s: FriendshipStatus) => {
    setStatus(s)
    onChange?.(s)
  }

  const onAdd = async () => {
    setBusy(true)
    set('pending_sent')
    try {
      await sendRequest(userId)
    } finally {
      setBusy(false)
    }
  }
  const onAccept = async () => {
    setBusy(true)
    set('friends')
    try {
      await accept(userId)
    } finally {
      setBusy(false)
    }
  }

  if (status === 'friends') return <Pill icon={<Check size={15} />} label="Amis" tone="muted" />
  if (status === 'pending_sent')
    return <Pill icon={<Clock size={14} />} label="Demande envoyée" tone="muted" />
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

function Pill({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: 'muted' }) {
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
