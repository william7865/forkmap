'use client'
// AdminVerificationsSheet — moderate pending verification requests (admin only).
// The route is admin-gated; this UI simply renders what it returns.
import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Dialog, SheetHeader } from '@/components/ui/Sheet'
import type { VerificationRequestWithProfile } from '@/types'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { Avatar } from '@/components/social/Avatar'

export default function AdminVerificationsSheet({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<VerificationRequestWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    getAuthHeaders().then((headers) => {
      apiFetch('/api/admin/verifications', { headers })
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((d: { data: VerificationRequestWithProfile[] }) => setItems(d.data ?? []))
        .finally(() => setLoading(false))
    })
  }
  useEffect(load, [])

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    setBusyId(id)
    try {
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
      const res = await apiFetch('/api/admin/verifications', {
        method: 'POST',
        headers,
        body: JSON.stringify({ request_id: id, decision }),
      })
      if (res.ok) setItems((prev) => prev.filter((it) => it.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Dialog ariaLabel="Demandes de vérification" onClose={onClose} zIndex={3000}>
      <SheetHeader title="Demandes de vérification" onClose={onClose} align="left" />

      <div style={{ overflowY: 'auto', padding: '2px 16px 18px' }}>
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Chargement…</p>
        ) : items.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Aucune demande en attente.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {items.map((it) => (
              <div
                key={it.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  padding: 13,
                  background: 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar
                    name={it.profile.display_name}
                    src={it.profile.avatar_url}
                    id={it.user_id}
                    size={34}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
                      {it.profile.display_name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                      @{it.profile.username}
                    </div>
                  </div>
                </div>
                {it.note && (
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--text-2)',
                      lineHeight: 1.4,
                      margin: '10px 0 0',
                    }}
                  >
                    {it.note}
                  </p>
                )}
                {it.links.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                    {it.links.map((l, i) => (
                      <a
                        key={i}
                        href={l}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 12.5,
                          color: 'var(--accent)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          wordBreak: 'break-all',
                        }}
                      >
                        <ExternalLink size={12} /> {l}
                      </a>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => decide(it.id, 'reject')}
                    disabled={busyId === it.id}
                    style={{
                      flex: 1,
                      height: 40,
                      border: '1px solid var(--border)',
                      background: 'var(--white)',
                      borderRadius: 'var(--r-sm)',
                      color: 'var(--text-2)',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Refuser
                  </button>
                  <button
                    onClick={() => decide(it.id, 'approve')}
                    disabled={busyId === it.id}
                    style={{
                      flex: 1,
                      height: 40,
                      border: 'none',
                      background: 'var(--accent)',
                      borderRadius: 'var(--r-sm)',
                      color: 'var(--on-accent, #fff)',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Vérifier
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}
