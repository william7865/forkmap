'use client'
// PollCreate — bottom sheet to launch a group poll ("où on mange ce soir ?").
// Loads the user's favorites, lets them pick 2–6 as candidates, then creates
// the poll and shares the public link. Self-contained: fetches its own data so
// the favorites screen only needs to toggle it open.
import React, { useEffect, useMemo, useState } from 'react'
import { X, Check } from 'lucide-react'
import type { FavoriteRow, PlaceCard } from '@/types'
import { apiFetch } from '@/lib/api'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { nativeShare } from '@/lib/native/share'
import { frCuisine } from '@/lib/cuisine'
import PlaceThumb from '@/components/place/PlaceThumb'
import SharePollSheet from '@/components/poll/SharePollSheet'

const POLL_BASE = 'https://forkmap.vercel.app'
const MIN = 2
const MAX = 6

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const sb = getSupabaseBrowserClient()
    const {
      data: { session },
    } = await sb.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  } catch {
    return {}
  }
}

export default function PollCreate({ onClose }: { onClose: () => void }) {
  const [favorites, setFavorites] = useState<PlaceCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('Où on mange ce soir ?')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [pollId, setPollId] = useState<string | null>(null)
  const [sharingApp, setSharingApp] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/favorites', { headers: await authHeaders() })
        const json = await res.json()
        const rows = (json.data ?? []) as FavoriteRow[]
        if (active) setFavorites(rows.map((r) => r.snapshot).filter(Boolean))
      } catch {
        if (active) setError('Impossible de charger tes favoris.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const byId = useMemo(() => new Map(favorites.map((p) => [p.osm_id, p])), [favorites])

  const toggle = (osmId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(osmId)) next.delete(osmId)
      else if (next.size < MAX) next.add(osmId)
      return next
    })
  }

  const create = async () => {
    if (selected.size < MIN || !title.trim()) return
    setBusy(true)
    setError(null)
    try {
      const places = [...selected].map((id) => byId.get(id)).filter(Boolean) as PlaceCard[]
      const res = await apiFetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ title: title.trim(), places }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error ?? 'Échec de la création.')
      }
      const { data } = await res.json()
      const url = `${POLL_BASE}/sondage/${data.id}`
      setPollId(data.id)
      setShareUrl(url)
      // Fire the native share sheet immediately; web falls through to the link UI.
      await nativeShare({
        title: 'Où on mange ?',
        text: title.trim(),
        url,
        dialogTitle: 'Partager le sondage',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la création.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!shareUrl) return
    try {
      if (navigator.share)
        await navigator.share({ title: 'Où on mange ?', text: title, url: shareUrl })
      else {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }
    } catch {
      /* cancelled */
    }
  }

  const count = selected.size
  const canCreate = count >= MIN && !!title.trim() && !busy

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100001,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(14,14,13,0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative',
          background: 'var(--white)',
          borderRadius: '20px 20px 0 0',
          padding: '18px 18px calc(24px + var(--safe-bottom))',
          width: '100%',
          maxWidth: 520,
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--s3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 19,
              color: 'var(--ink)',
            }}
          >
            {shareUrl ? 'Sondage créé 🎉' : 'Lancer un sondage'}
          </h2>
          <button onClick={onClose} aria-label="Fermer" style={iconBtn}>
            <X size={20} />
          </button>
        </div>

        {shareUrl ? (
          <ShareResult
            url={shareUrl}
            copied={copied}
            onCopy={copy}
            onShareApp={() => setSharingApp(true)}
            onDone={onClose}
          />
        ) : (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Titre du sondage"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1.5px solid var(--b2)',
                fontSize: 15,
                fontFamily: 'inherit',
                color: 'var(--ink)',
                marginBottom: 12,
                background: 'var(--bg)',
              }}
            />
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-3)',
                margin: '0 2px 8px',
                fontWeight: 600,
              }}
            >
              Choisis 2 à 6 restos {count > 0 && `· ${count} sélectionné${count > 1 ? 's' : ''}`}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', margin: '0 -4px', padding: '0 4px' }}>
              {loading ? (
                <div
                  style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}
                >
                  Chargement…
                </div>
              ) : favorites.length === 0 ? (
                <div
                  style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}
                >
                  Ajoute d&apos;abord des favoris pour lancer un sondage.
                </div>
              ) : (
                favorites.map((p) => {
                  const on = selected.has(p.osm_id)
                  const disabled = !on && count >= MAX
                  const c = p.cuisine ?? p.fsq?.categories?.[0]?.name
                  return (
                    <button
                      key={p.osm_id}
                      onClick={() => toggle(p.osm_id)}
                      disabled={disabled}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        padding: '8px',
                        borderRadius: 14,
                        border: 'none',
                        background: on ? 'var(--bone)' : 'none',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.45 : 1,
                        textAlign: 'left',
                        marginBottom: 2,
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 10,
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        <PlaceThumb place={p} initialSize={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 15,
                            color: 'var(--ink)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.name}
                        </div>
                        {c && (
                          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                            {frCuisine(c)}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          border: on ? 'none' : '1.5px solid var(--b2)',
                          background: on ? 'var(--accent)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {on && <Check size={15} color="var(--white)" strokeWidth={3} />}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {error && (
              <div style={{ color: 'var(--coral)', fontSize: 13, margin: '8px 2px 0' }}>
                {error}
              </div>
            )}
            <button
              className="btn-primary"
              onClick={create}
              disabled={!canCreate}
              style={{ marginTop: 12, opacity: canCreate ? 1 : 0.5 }}
            >
              {busy ? 'Création…' : 'Créer & partager'}
            </button>
          </>
        )}
      </div>
      {sharingApp && pollId && (
        <SharePollSheet pollId={pollId} title={title} onClose={() => setSharingApp(false)} />
      )}
    </div>
  )
}

function ShareResult({
  url,
  copied,
  onCopy,
  onShareApp,
  onDone,
}: {
  url: string
  copied: boolean
  onCopy: () => void
  onShareApp: () => void
  onDone: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.45 }}>
        Partage-le avec ton groupe. Chacun peut voter, même sans compte.
      </p>
      <div
        style={{
          padding: '11px 14px',
          borderRadius: 12,
          background: 'var(--bg)',
          border: '1px solid var(--b2)',
          fontSize: 13,
          color: 'var(--text-2)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {url.replace('https://', '')}
      </div>
      <button className="btn-primary" onClick={onShareApp}>
        Partager à des amis
      </button>
      <button
        onClick={onCopy}
        style={{
          background: 'var(--white)',
          border: '1.5px solid var(--b2)',
          borderRadius: 12,
          padding: 12,
          cursor: 'pointer',
          color: 'var(--ink)',
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: 'inherit',
        }}
      >
        {copied ? 'Lien copié ✓' : 'Copier / partager le lien'}
      </button>
      <button
        onClick={onDone}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Terminé
      </button>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-3)',
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
}
