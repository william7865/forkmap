'use client'
// NotifyPrefSheet — a verified tastemaker chooses what pings their followers.
import { useState } from 'react'
import { X } from 'lucide-react'
import { useProfile } from '@/lib/hooks/useProfile'

type Pref = 'saves' | 'lists' | 'off'

const OPTIONS: { key: Pref; label: string; hint: string }[] = [
  { key: 'saves', label: 'Chaque resto enregistré', hint: 'Tes abonnés sont prévenus à chaque favori.' },
  { key: 'lists', label: 'Mes listes publiques', hint: 'Prévenus quand tu mets à jour une liste publique.' },
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
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-slide-up"
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--white)',
          borderRadius: '20px 20px 0 0',
          padding: '18px 18px calc(20px + env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            Prévenir mes abonnés
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              border: 'none',
              background: 'var(--surface)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-2)',
            }}
          >
            <X size={17} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
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
      </div>
    </div>
  )
}
