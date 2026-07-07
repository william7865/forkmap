'use client'
// VerificationSheet — request the tastemaker verification badge and track status.
import { useEffect, useState } from 'react'
import { X, BadgeCheck } from 'lucide-react'
import type { VerificationRequest } from '@/types'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'

const STATUS_COPY: Record<string, { title: string; tone: string }> = {
  pending: { title: 'Demande en cours d’examen', tone: 'var(--text-2)' },
  approved: { title: 'Compte vérifié ✓', tone: 'var(--accent)' },
  rejected: { title: 'Demande refusée', tone: 'var(--closed)' },
}

export default function VerificationSheet({ onClose }: { onClose: () => void }) {
  const [request, setRequest] = useState<VerificationRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [links, setLinks] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAuthHeaders().then((headers) => {
      apiFetch('/api/verification', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { data: VerificationRequest | null } | null) => {
          if (cancelled) return
          setRequest(d?.data ?? null)
          if (d?.data) {
            setNote(d.data.note ?? '')
            setLinks(d.data.links.join('\n'))
          }
        })
        .finally(() => !cancelled && setLoading(false))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setErr(null)
    const parsedLinks = links
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter(Boolean)
    try {
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
      const res = await apiFetch('/api/verification', {
        method: 'POST',
        headers,
        body: JSON.stringify({ note: note.trim() || null, links: parsedLinks }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Échec de l’envoi.')
      }
      const { data } = (await res.json()) as { data: VerificationRequest }
      setRequest(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec de l’envoi.')
    } finally {
      setBusy(false)
    }
  }

  const status = request?.status
  const canEdit = !status || status === 'rejected'

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
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            <BadgeCheck size={20} color="var(--accent)" /> Vérification
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

        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.45, margin: '10px 0 16px' }}>
          Le badge vérifié distingue les prescripteurs de confiance. Explique pourquoi ton compte
          devrait l’obtenir et ajoute des liens (réseaux, presse, site) qui prouvent ton identité.
        </p>

        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Chargement…</p>
        ) : (
          <>
            {status && (
              <div
                style={{
                  padding: '11px 13px',
                  borderRadius: 'var(--r-lg)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{ fontSize: 13.5, fontWeight: 700, color: STATUS_COPY[status]?.tone }}
                >
                  {STATUS_COPY[status]?.title}
                </div>
                {status === 'rejected' && request?.reviewer_note && (
                  <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '4px 0 0' }}>
                    {request.reviewer_note}
                  </p>
                )}
              </div>
            )}

            {canEdit && (
              <>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 500))}
                  placeholder="Pourquoi vérifier ton compte ?"
                  rows={3}
                  style={{
                    width: '100%',
                    resize: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)',
                    padding: '11px 13px',
                    fontSize: 14.5,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--text)',
                    background: 'var(--surface)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginBottom: 10,
                  }}
                />
                <textarea
                  value={links}
                  onChange={(e) => setLinks(e.target.value)}
                  placeholder="Liens (un par ligne) — Instagram, site, presse…"
                  rows={3}
                  style={{
                    width: '100%',
                    resize: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)',
                    padding: '11px 13px',
                    fontSize: 13.5,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--text)',
                    background: 'var(--surface)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {err && (
                  <p style={{ color: 'var(--closed)', fontSize: 12.5, marginTop: 10 }}>{err}</p>
                )}
                <button
                  onClick={submit}
                  disabled={busy}
                  style={{
                    marginTop: 16,
                    width: '100%',
                    height: 46,
                    border: 'none',
                    borderRadius: 'var(--r-lg)',
                    background: busy ? 'var(--border)' : 'var(--accent)',
                    color: 'var(--on-accent, #fff)',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: busy ? 'default' : 'pointer',
                  }}
                >
                  {busy ? 'Envoi…' : status === 'rejected' ? 'Renvoyer une demande' : 'Demander la vérification'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
