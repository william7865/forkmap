// NoteModal.tsx — Note personnelle sur un restaurant (localStorage)
'use client'
import React, { useState } from 'react'
import type { PlaceCard } from '@/types'

const STORAGE_KEY = 'forkmap_notes_v1'

export function getNotes(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}
export function getNote(osmId: string): string {
  return getNotes()[osmId] ?? ''
}
export function saveNote(osmId: string, note: string) {
  const notes = getNotes()
  if (note.trim()) notes[osmId] = note.trim()
  else delete notes[osmId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

// ── Icons ─────────────────────────────────────────────────
const IcoX = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
const IcoPen = () => (
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
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
)

interface Props {
  place: PlaceCard
  onClose: () => void
  onSaved?: (note: string) => void
}

export default function NoteModal({ place, onClose, onSaved }: Props) {
  const [value, setValue] = useState(() => getNote(place.osm_id))
  const [saved, setSaved] = useState(false)
  const MAX = 280

  const handleSave = () => {
    saveNote(place.osm_id, value)
    setSaved(true)
    onSaved?.(value.trim())
    setTimeout(onClose, 800)
  }

  const cuisine = place.cuisine ?? place.fsq?.categories?.[0]?.name

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(14,14,13,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--white)',
          borderRadius: 'var(--r-xl)',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 32px 80px rgba(14,14,13,0.22), 0 0 0 1px rgba(14,14,13,0.07)',
          overflow: 'hidden',
          animation: 'scaleIn 220ms var(--ease-spring) both',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--ink-10)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--r-md)',
              background: 'var(--forest-pale)',
              border: '1px solid rgba(187,94,46,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--forest-mid)',
            }}
          >
            <IcoPen />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                margin: '0 0 3px',
                fontFamily: 'var(--font-display)',
                fontSize: 17,
                fontWeight: 400,
                letterSpacing: '-0.03em',
                color: 'var(--ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {place.name}
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-40)', fontWeight: 500 }}>
              {cuisine ?? 'Restaurant'} · Note personnelle
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid var(--ink-10)',
              background: 'var(--off-white)',
              color: 'var(--ink-60)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 120ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--cream)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--off-white)'
            }}
          >
            <IcoX />
          </button>
        </div>

        {/* Textarea */}
        <div style={{ padding: '16px 20px 20px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--ink-60)', lineHeight: 1.6 }}>
            Tes impressions, ce que tu veux commander, avec qui y aller…
          </p>
          <div style={{ position: 'relative' }}>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value.slice(0, MAX))}
              placeholder="Ex: Meilleure pizza de Paris, réserver à l'avance le weekend…"
              rows={5}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                borderRadius: 'var(--r-md)',
                border: `1.5px solid ${value.length > MAX * 0.9 ? 'var(--amber)' : 'var(--ink-10)'}`,
                background: 'var(--off-white)',
                fontSize: 13,
                color: 'var(--ink)',
                lineHeight: 1.65,
                fontFamily: 'var(--font-body)',
                resize: 'none',
                outline: 'none',
                transition: 'border-color 150ms ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--forest-mid)'
                e.target.style.boxShadow = 'var(--s-focus)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor =
                  value.length > MAX * 0.9 ? 'var(--amber)' : 'var(--ink-10)'
                e.target.style.boxShadow = 'none'
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 10,
                right: 12,
                fontSize: 10,
                color: value.length > MAX * 0.9 ? 'var(--amber)' : 'var(--ink-40)',
                fontWeight: 500,
                transition: 'color 150ms',
              }}
            >
              {value.length}/{MAX}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {value.trim() && (
              <button
                onClick={() => {
                  setValue('')
                  saveNote(place.osm_id, '')
                }}
                style={{
                  padding: '9px 14px',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid rgba(217,79,61,0.25)',
                  background: 'transparent',
                  color: 'var(--coral)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  transition: 'all 120ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--coral-pale)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Effacer
              </button>
            )}
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '10px 18px',
                borderRadius: 'var(--r-md)',
                border: 'none',
                background: saved ? 'var(--green)' : 'var(--forest-mid)',
                color: 'white',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                boxShadow: saved ? '0 4px 16px rgba(22,163,74,0.28)' : 'var(--s-forest)',
                transition: 'all 220ms ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {saved ? (
                <>
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
                  Note enregistrée !
                </>
              ) : (
                'Enregistrer la note'
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes scaleIn{from{opacity:0;transform:scale(0.93) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  )
}
