// ============================================================
// components/place/VisitModal.tsx
// Modal to log / edit a restaurant visit
// ============================================================
'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Sheet, SheetHeader } from '@/components/ui/Sheet'
import type { PlaceCard } from '@/types'
import { friendlyError } from '@/lib/api-errors'
import { apiFetch } from '@/lib/api'
import { successTap, errorTap } from '@/lib/native/haptics'
import {
  IcoMoodSolo,
  IcoMoodCouple,
  IcoMoodFriends,
  IcoMoodFamily,
  IcoMoodWork,
} from '@/components/icons'
import type { LucideProps } from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-headers'

interface VisitRow {
  id: string
  visited_at: string
  amount_spent?: number
  people_count: number
  personal_rating?: number
  mood?: string
  note?: string
}

interface Props {
  place: PlaceCard
  existingVisit?: VisitRow | null
  onClose: () => void
  onSaved: () => void
}

const MOODS: { id: string; label: string; Icon: (p: LucideProps) => React.ReactElement }[] = [
  { id: 'solo', label: 'Solo', Icon: IcoMoodSolo },
  { id: 'couple', label: 'En couple', Icon: IcoMoodCouple },
  { id: 'friends', label: 'Amis', Icon: IcoMoodFriends },
  { id: 'family', label: 'Famille', Icon: IcoMoodFamily },
  { id: 'work', label: 'Travail', Icon: IcoMoodWork },
]

const IcoStar = ({ filled }: { filled: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const IcoCheck = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IcoTrash = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

function useSwipeDismiss(onClose: () => void) {
  const startY = React.useRef<number | null>(null)
  return {
    onTouchStart: (e: React.TouchEvent) => {
      startY.current = e.touches[0].clientY
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (startY.current === null) return
      if (e.touches[0].clientY - startY.current > 80) {
        startY.current = null
        onClose()
      }
    },
  }
}

export default function VisitModal({ place, existingVisit, onClose, onSaved }: Props) {
  const isEdit = !!existingVisit
  const swipeProps = useSwipeDismiss(onClose)
  const panelRef = useRef<HTMLDivElement>(null)

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Focus first focusable element on open (the header close button)
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('button')?.focus()
  }, [])

  // Focus trap
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    panel.addEventListener('keydown', handler)
    return () => panel.removeEventListener('keydown', handler)
  }, [])

  const [date, setDate] = useState(
    existingVisit?.visited_at ?? new Date().toISOString().slice(0, 10)
  )
  const [amount, setAmount] = useState(existingVisit?.amount_spent?.toString() ?? '')
  const [people, setPeople] = useState(existingVisit?.people_count ?? 1)
  const [rating, setRating] = useState(existingVisit?.personal_rating ?? 0)
  const [mood, setMood] = useState(existingVisit?.mood ?? '')
  const [note, setNote] = useState(existingVisit?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [hoverStar, setHoverStar] = useState(0)

  const perPerson = amount && people > 1 ? (parseFloat(amount) / people).toFixed(2) : null

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const headers = await getAuthHeaders()
    const body = {
      osm_id: place.osm_id,
      name: place.name,
      lat: place.lat,
      lon: place.lon,
      visited_at: date,
      amount_spent: amount ? parseFloat(amount) : null,
      people_count: people,
      personal_rating: rating || null,
      mood: mood || undefined,
      note: note || undefined,
      snapshot: place,
    }
    try {
      const res = isEdit
        ? await apiFetch(`/api/visits/${existingVisit!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
          })
        : await apiFetch('/api/visits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
          })
      if (!res.ok) {
        const d = await res.json()
        setError(friendlyError(d.error))
        errorTap()
        setSaving(false)
        return
      }
      setSaved(true)
      successTap()
      setTimeout(() => {
        onSaved()
        onClose()
      }, 700)
    } catch (err) {
      setError(friendlyError(err))
      errorTap()
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingVisit) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/visits/${existingVisit.id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(friendlyError(d.error ?? d))
        return
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  const title = isEdit ? 'Modifier la visite' : 'Logger une visite'

  return (
    <Sheet
      ariaLabel={title}
      onClose={onClose}
      zIndex={9200}
      maxHeight="92vh"
      grabber={false}
      style={{ background: 'var(--white)', maxWidth: 520, margin: '0 auto' }}
    >
      <div
        ref={panelRef}
        style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
      >
        {/* Handle — custom (not Sheet's) to keep the swipe-down dismiss */}
        <div
          {...swipeProps}
          aria-hidden
          style={{
            width: 36,
            height: 4,
            borderRadius: 999,
            background: 'var(--border-strong)',
            margin: '10px auto 0',
            flexShrink: 0,
          }}
        />

        <SheetHeader
          title={title}
          align="left"
          onClose={onClose}
          subtitle={
            <>
              {place.name}
              {place.cuisine && (
                <span style={{ marginLeft: 6, color: 'var(--forest-mid)' }}>{place.cuisine}</span>
              )}
            </>
          }
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '4px 20px 24px',
          }}
        >
          {/* Date */}
          <div>
            <label htmlFor="visit-date" style={labelStyle}>
              Date de la visite
            </label>
            <input
              id="visit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              style={inputStyle}
            />
          </div>

          {/* Dépense + personnes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="visit-amount" style={labelStyle}>
                Montant total (€)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="visit-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max="9999"
                  step="0.01"
                  style={{ ...inputStyle, paddingRight: 28 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 13,
                    color: 'var(--ink-40)',
                    pointerEvents: 'none',
                  }}
                >
                  €
                </span>
              </div>
              {perPerson && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 10,
                    color: 'var(--forest-mid)',
                    fontWeight: 600,
                  }}
                >
                  ≈ {perPerson} €/pers.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="visit-people" style={labelStyle}>
                Nombre de personnes
              </label>
              <div id="visit-people" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  aria-label="Diminuer le nombre de personnes"
                  onClick={() => setPeople((p) => Math.max(1, p - 1))}
                  style={counterBtn}
                >
                  −
                </button>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    minWidth: 24,
                    textAlign: 'center',
                  }}
                >
                  {people}
                </span>
                <button
                  aria-label="Augmenter le nombre de personnes"
                  onClick={() => setPeople((p) => Math.min(50, p + 1))}
                  style={counterBtn}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Rating personnel */}
          <div>
            <label id="visit-rating-label" style={labelStyle}>
              <IcoStar filled /> Ma note personnelle
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRating((r) => (r === s ? 0 : s))}
                  onMouseEnter={() => setHoverStar(s)}
                  onMouseLeave={() => setHoverStar(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    color: (hoverStar || rating) >= s ? 'var(--accent)' : 'var(--ink-20)',
                    transition: 'color 100ms,transform 100ms',
                    transform: (hoverStar || rating) >= s ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  <IcoStar filled={(hoverStar || rating) >= s} />
                </button>
              ))}
              {rating > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-60)',
                    marginLeft: 4,
                    alignSelf: 'center',
                  }}
                >
                  {['', 'Mauvais', 'Bof', 'Bien', 'Très bien', 'Excellent'][rating]}
                </span>
              )}
            </div>
          </div>

          {/* Mood */}
          <div>
            <label htmlFor="visit-mood" style={labelStyle}>
              Contexte
            </label>
            <div id="visit-mood" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMood((v) => (v === m.id ? '' : m.id))}
                  aria-pressed={mood === m.id}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--r-pill)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${mood === m.id ? 'var(--forest-mid)' : 'var(--ink-10)'}`,
                    background: mood === m.id ? 'var(--forest-pale)' : 'transparent',
                    color: mood === m.id ? 'var(--forest)' : 'var(--ink-60)',
                    fontFamily: 'inherit',
                    transition: 'all 120ms',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <m.Icon size={15} aria-hidden="true" /> {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label htmlFor="visit-note" style={labelStyle}>
              Note (optionnel)
            </label>
            <textarea
              id="visit-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Ce que j'ai mangé, l'ambiance, si je recommande…"
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--forest-mid)'
                e.target.style.boxShadow = 'var(--s-focus)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--ink-10)'
                e.target.style.boxShadow = 'none'
              }}
            />
            <p
              style={{
                margin: '3px 0 0',
                fontSize: 10,
                color: 'var(--ink-40)',
                textAlign: 'right',
              }}
            >
              {note.length}/500
            </p>
          </div>

          {error && (
            <p
              role="alert"
              style={{ margin: 0, fontSize: 12, color: 'var(--coral)', fontWeight: 600 }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            {isEdit && (
              <button
                onClick={handleDelete}
                aria-label="Supprimer cette visite"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--r-md)',
                  border: '1px solid rgba(217,79,61,0.25)',
                  background: 'var(--coral-pale)',
                  color: 'var(--coral)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IcoTrash />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || saved}
              style={{
                flex: 1,
                padding: '13px',
                borderRadius: 'var(--r-md)',
                border: 'none',
                background: saved ? 'var(--green)' : 'var(--forest-mid)',
                color: 'var(--on-accent)',
                cursor: saving || saved ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'inherit',
                boxShadow: 'var(--s-forest)',
                transition: 'background 200ms',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {saved ? (
                <>
                  <IcoCheck /> Enregistré !
                </>
              ) : saving ? (
                'Enregistrement…'
              ) : isEdit ? (
                'Mettre à jour'
              ) : (
                'Enregistrer la visite'
              )}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 7,
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--ink-60)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}
const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--ink-10)',
  background: 'var(--off-white)',
  fontSize: 13,
  color: 'var(--ink)',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  transition: 'border-color 150ms,box-shadow 150ms',
}
const counterBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 'var(--r-sm)',
  border: '1px solid var(--ink-10)',
  background: 'var(--off-white)',
  color: 'var(--ink)',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'inherit',
  transition: 'all 120ms',
}
