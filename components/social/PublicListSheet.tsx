'use client'
import { useEffect, useState } from 'react'
import { ChevronLeft, Bookmark, Check } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { frCuisine } from '@/lib/cuisine'
import type { PlaceCard, PublicListDetail } from '@/types'

export default function PublicListSheet({
  listId,
  listName,
  onClose,
}: {
  listId: string
  listName: string
  onClose: () => void
}) {
  const [items, setItems] = useState<PlaceCard[]>([])
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const headers = await getAuthHeaders()
        const [listRes, favRes] = await Promise.all([
          apiFetch(`/api/lists/${listId}/public`, { headers }),
          apiFetch('/api/favorites', { headers }),
        ])
        if (!alive) return
        if (!listRes.ok) {
          setState('error')
          return
        }
        const detail = (await listRes.json()).data as PublicListDetail
        setItems(detail.items ?? [])
        if (favRes.ok) {
          const favs = ((await favRes.json()).data ?? []) as Array<{ osm_id: string }>
          setSaved(new Set(favs.map((f) => f.osm_id)))
        }
        setState('ready')
      } catch {
        if (alive) setState('error')
      }
    })()
    return () => {
      alive = false
    }
  }, [listId])

  const save = async (place: PlaceCard) => {
    setSaved((s) => new Set(s).add(place.osm_id)) // optimistic
    try {
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
      const res = await apiFetch('/api/favorites', {
        method: 'POST',
        headers,
        body: JSON.stringify({ place }),
      })
      if (!res.ok) throw new Error('save_failed')
    } catch {
      setSaved((s) => {
        const n = new Set(s)
        n.delete(place.osm_id)
        return n
      })
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        overflowY: 'auto',
        background: 'var(--bg)',
        paddingBottom: 'calc(var(--safe-bottom) + 40px)',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: 'calc(var(--safe-top) + 10px) 16px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
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
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 20,
            color: 'var(--ink)',
          }}
        >
          {listName}
        </h1>
      </div>

      <div style={{ padding: '8px 16px 0' }}>
        {state === 'loading' && <Muted>Chargement…</Muted>}
        {state === 'error' && <Muted>Impossible de charger la liste.</Muted>}
        {state === 'ready' && items.length === 0 && <Muted>Cette liste est vide.</Muted>}
        {items.map((p) => {
          const isSaved = saved.has(p.osm_id)
          return (
            <div
              key={p.osm_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                marginBottom: 8,
                background: 'var(--white)',
                border: '1px solid var(--b2)',
                borderRadius: 'var(--r-md)',
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 15,
                    color: 'var(--ink)',
                  }}
                >
                  {p.name}
                </strong>
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {[
                    p.cuisine ? frCuisine(p.cuisine) : null,
                    p.fsq_rating ? `★ ${p.fsq_rating.toFixed(1)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <button
                onClick={() => !isSaved && save(p)}
                disabled={isSaved}
                aria-label={isSaved ? 'Enregistré' : 'Enregistrer dans mes favoris'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--b2)',
                  background: isSaved ? 'var(--accent)' : 'var(--white)',
                  color: isSaved ? '#fff' : 'var(--accent)',
                  cursor: isSaved ? 'default' : 'pointer',
                  flexShrink: 0,
                }}
              >
                {isSaved ? <Check size={18} /> : <Bookmark size={18} />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '8px 4px', fontSize: 13.5, color: 'var(--text-3)' }}>{children}</p>
}
