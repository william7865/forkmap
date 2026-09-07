'use client'
// NotifyPrefSheet — a verified tastemaker chooses what pings their followers.
import { useState } from 'react'
import { Dialog, SheetHeader } from '@/components/ui/Sheet'
import { useProfile } from '@/lib/hooks/useProfile'

type Pref = 'saves' | 'lists' | 'off'

const OPTIONS: { key: Pref; label: string; hint: string }[] = [
  {
    key: 'saves',
    label: 'Chaque resto enregistré',
    hint: 'Tes abonnés sont prévenus à chaque favori.',
  },
  {
    key: 'lists',
    label: 'Mes listes publiques',
    hint: 'Prévenus quand tu mets à jour une liste publique.',
  },
  { key: 'off', label: 'Ne rien envoyer', hint: 'Aucune notification à tes abonnés.' },
]

export default function NotifyPrefSheet({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile } = useProfile()
  const [pref, setPref] = useState<Pref>(profile?.follower_notify_pref ?? 'lists')
  const [busy, setBusy] = useState(false)

  const choose = async (p: Pref) => {
    if (busy || p === pref) return
    const prev = pref
    setPref(p)
    setBusy(true)
    const res = await updateProfile({ follower_notify_pref: p })
    setBusy(false)
    if (!res.ok) setPref(prev) // revert on failure
  }

  return (
    <Dialog ariaLabel="Prévenir mes abonnés" onClose={onClose} zIndex={3000}>
      <SheetHeader title="Prévenir mes abonnés" onClose={onClose} align="left" />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '4px 16px 18px',
          overflowY: 'auto',
        }}
      >
        {OPTIONS.map((o) => {
          const active = pref === o.key
          return (
            <button
              key={o.key}
              onClick={() => choose(o.key)}
              aria-pressed={active}
              style={{
                textAlign: 'left',
                padding: '13px 14px',
                borderRadius: 'var(--r-lg)',
                border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'var(--accent-light)' : 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: active ? 'var(--accent-text, var(--accent))' : 'var(--text)',
                }}
              >
                {o.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{o.hint}</div>
            </button>
          )
        })}
      </div>
    </Dialog>
  )
}
