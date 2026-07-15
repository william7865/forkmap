// ============================================================
// app/(pages)/favorites/page.tsx — Lieux enregistrés
// Lieux enregistrés : listes collections + vue liste/grille des favoris
// ============================================================
'use client'

import React, { Suspense, useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import type { FavoriteRow, PlaceCard } from '@/types'
import { useAuthGuard } from '@/lib/hooks/useAuthGuard'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { PageHeader, GlobalFooter } from '@/components/ui/PageLayout'
import { getNotes, getNote, saveNote } from '@/components/place/NoteModal'
import { apiFetch } from '@/lib/api'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import { useIsNative } from '@/lib/native/platform'
import { useLists, type ListRow as HookListRow } from '@/lib/hooks/useLists'
import ImportsRow from '@/components/import/ImportsRow'
import { useImportsStore } from '@/lib/hooks/useImportsContext'
import { ListCard, NewListCard } from '@/components/lists/ListCard'
import CollaboratorsSheet from '@/components/lists/CollaboratorsSheet'
import { Avatar } from '@/components/social/Avatar'
import { CreateListModal } from '@/components/lists/CreateListModal'
import PollCreate from '@/components/poll/PollCreate'
import { SaveToListPopup } from '@/components/lists/SaveToListPopup'
import { placeGradient } from '@/lib/gradients'
import { placeInitial } from '@/components/place/PlaceThumb'
import { frCuisine } from '@/lib/cuisine'
import { setPendingSelect } from '@/lib/pendingSelect'

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const sb = getSupabaseBrowserClient()
    const {
      data: { session },
    } = await sb.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  } catch {
    return {}
  }
}

// ── Icons ─────────────────────────────────────────────────
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
const IcoStar = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const IcoShare = () => (
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
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
)
const IcoPen = () => (
  <svg
    width="12"
    height="12"
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
const IcoCheck = () => (
  <svg
    width="13"
    height="13"
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
const IcoCopy = () => (
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
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)
const IcoWhatsApp = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
)
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
const IcoGrid = () => (
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
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
)
const IcoList = () => (
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
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)

// ── Types ─────────────────────────────────────────────────
type SortKey = 'date_desc' | 'date_asc' | 'name' | 'rating'
type ViewMode = 'list' | 'grid'

interface ListItemEntry {
  id: string
  list_id: string
  osm_id: string
  place_snapshot: Record<string, unknown>
  added_at: string
}

// ── Delete modal ──────────────────────────────────────────
function DeleteModal({
  name,
  onConfirm,
  onCancel,
}: {
  name: string
  onConfirm: () => void
  onCancel: () => void
}) {
  // Escape key handler
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(25,28,29,0.45)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--bg)',
          borderRadius: 'var(--r-2xl)',
          padding: '28px',
          maxWidth: 360,
          width: '100%',
          border: '1px solid var(--border)',
          boxShadow: 'var(--s4)',
          animation: 'scaleIn 200ms var(--ease-spring) both',
          fontFamily: 'var(--font-body)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--r-md)',
            background: 'var(--coral-pale)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            color: 'var(--coral)',
          }}
        >
          <IcoTrash />
        </div>
        <h3
          id="delete-modal-title"
          style={{
            margin: '0 0 8px',
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: '-0.03em',
          }}
        >
          Retirer des favoris ?
        </h3>
        <p style={{ margin: '0 0 22px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--ink-80)' }}>{name}</strong> sera retiré de vos lieux
          enregistrés.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            aria-label="Annuler"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink-80)',
              fontFamily: 'inherit',
            }}
          >
            Garder
          </button>
          <button
            onClick={onConfirm}
            aria-label="Supprimer"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--r-md)',
              border: 'none',
              background: 'var(--coral)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'white',
              fontFamily: 'inherit',
              boxShadow: 'var(--s2)',
            }}
          >
            Retirer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Note inline modal ─────────────────────────────────────
function NoteDrawer({
  fav,
  onClose,
  onSaved,
}: {
  fav: FavoriteRow
  onClose: () => void
  onSaved: (note: string) => void
}) {
  const [value, setValue] = useState(() => getNote(fav.osm_id))
  const [saved, setSaved] = useState(false)
  const MAX = 280

  const handleSave = () => {
    saveNote(fav.osm_id, value)
    setSaved(true)
    onSaved(value.trim())
    setTimeout(onClose, 700)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 0 0 0',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(25,28,29,0.45)',
          backdropFilter: 'blur(6px)',
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--bg)',
          borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
          width: '100%',
          maxWidth: 520,
          padding: '20px 20px 32px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--s4)',
          animation: 'slideUp 240ms var(--ease-out) both',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 'var(--r-pill)',
            background: 'var(--bone)',
            margin: '0 auto 16px',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--r-md)',
              background: 'var(--accent-light)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              flexShrink: 0,
            }}
          >
            <IcoPen />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: '0 0 1px',
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {fav.name}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                color: 'var(--text-3)',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Note personnelle
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IcoX />
          </button>
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX))}
          rows={4}
          placeholder="Tes impressions, ce que tu veux commander, avec qui y aller…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '11px 13px',
            borderRadius: 'var(--r-md)',
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            fontSize: 13,
            color: 'var(--text)',
            lineHeight: 1.65,
            fontFamily: 'var(--font-body)',
            resize: 'none',
            outline: 'none',
            transition: 'border-color 150ms',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent)'
            e.target.style.boxShadow = 'var(--s-focus)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border)'
            e.target.style.boxShadow = 'none'
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>
            {value.length}/{MAX}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {value.trim() && (
            <button
              onClick={() => {
                setValue('')
                saveNote(fav.osm_id, '')
                onSaved('')
              }}
              style={{
                padding: '9px 14px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border-strong)',
                background: 'transparent',
                color: 'var(--coral)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
                transition: 'all 120ms',
              }}
            >
              Effacer
            </button>
          )}
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: 'var(--r-md)',
              border: 'none',
              background: saved ? 'var(--accent)' : 'var(--ember)',
              color: 'var(--on-accent)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              boxShadow: saved ? 'var(--s-accent)' : 'var(--s-ember)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'background 200ms',
            }}
          >
            {saved ? (
              <>
                <IcoCheck />
                Enregistrée !
              </>
            ) : (
              'Enregistrer la note'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Share mini-modal ──────────────────────────────────────
function ShareDrawer({ fav, onClose }: { fav: FavoriteRow; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fav.name)}&query_place_id=${fav.lat},${fav.lon}`
  const text = `🍴 ${fav.name}${fav.snapshot?.cuisine ? ` · ${fav.snapshot.cuisine}` : ''}, repéré sur Forkmap`
  const full = `${text}\n${mapsUrl}`

  const copy = async () => {
    await navigator.clipboard.writeText(full).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9100,
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
          background: 'rgba(25,28,29,0.45)',
          backdropFilter: 'blur(6px)',
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--bg)',
          borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
          width: '100%',
          maxWidth: 520,
          padding: '20px 20px 32px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--s4)',
          animation: 'slideUp 240ms var(--ease-out) both',
          fontFamily: 'var(--font-body)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 'var(--r-pill)',
            background: 'var(--bone)',
            margin: '0 auto 16px',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fav.name}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IcoX />
          </button>
        </div>
        {/* Canaux */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            {
              icon: <IcoWhatsApp />,
              label: 'WhatsApp',
              color: 'var(--forest-bright)',
              bg: 'var(--accent-light)',
              onClick: () =>
                window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank'),
            },
            {
              icon: (
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              ),
              label: 'SMS',
              color: 'var(--sky)',
              bg: 'var(--sky-pale)',
              onClick: () => window.open(`sms:?body=${encodeURIComponent(full)}`, '_blank'),
            },
            {
              icon: (
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              ),
              label: 'Email',
              color: 'var(--text-2)',
              bg: 'var(--cream)',
              onClick: () =>
                window.open(
                  `mailto:?subject=${encodeURIComponent('Restaurant : ' + fav.name)}&body=${encodeURIComponent(full)}`,
                  '_blank'
                ),
            },
          ].map((ch, i) => (
            <button
              key={i}
              onClick={ch.onClick}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '12px 8px',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border)',
                background: 'var(--white)',
                cursor: 'pointer',
                transition: 'all 150ms',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = ch.bg
                e.currentTarget.style.borderColor = ch.color + '44'
                e.currentTarget.style.color = ch.color
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--white)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-2)'
              }}
            >
              <div style={{ color: 'inherit' }}>{ch.icon}</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'inherit' }}>{ch.label}</span>
            </button>
          ))}
        </div>
        {/* Copie lien */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 10px 9px 14px',
            borderRadius: 'var(--r-md)',
            background: 'var(--surface)',
            border: `1px solid ${copied ? 'var(--accent)' : 'var(--border)'}`,
            transition: 'border-color 200ms',
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 11,
              color: 'var(--text-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {mapsUrl.replace('https://', '')}
          </span>
          <button
            onClick={copy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 'var(--r-sm)',
              background: copied ? 'var(--accent-light)' : 'var(--bg)',
              border: `1px solid ${copied ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              color: copied ? 'var(--accent)' : 'var(--text-2)',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 200ms',
            }}
          >
            {copied ? <IcoCheck /> : <IcoCopy />} {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Fav card — liste ──────────────────────────────────────
function favPhoto(fav: FavoriteRow, w = 240): string | null {
  const ph = fav.snapshot?.fsq?.photos?.[0]
  if (ph) return `${ph.prefix}${w}x${Math.round(w * (ph.height / ph.width))}${ph.suffix}`
  // Free fallback: Wikidata/Wikimedia image
  return fav.snapshot?.wikidata?.image_url ?? null
}

/**
 * Snapshot photos are plain `<img>`, never `next/image`.
 *
 * A snapshot stores whatever URL the client held when the place was saved, and a
 * mobile build stamps an absolute `https://forkmap.vercel.app/api/places/google-photo?…`
 * prefix. `next/image` throws "Invalid src prop" on any host missing from
 * `images.remotePatterns`, which took the whole page down with it. The proxy already
 * serves a sized image, so there is nothing left to optimise. On error the tile falls
 * back to its gradient, exactly like PlaceThumb does everywhere else.
 */
function FavPhoto({ src }: { src: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  )
}

const MetaDot = () => (
  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-4)' }} />
)

// Pilule de filtre façon Albo — active = fond accent / blanc.
function chipStyle(active: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    height: 36,
    padding: '0 16px',
    borderRadius: 999,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--bg)',
    color: active ? '#fff' : 'var(--text-2)',
    fontFamily: 'var(--font-body)',
    fontSize: 13.5,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  }
}

const icoBtnStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: '50%',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-2)',
  cursor: 'pointer',
  flexShrink: 0,
}

// En-tête de section serif façon Albo — « Mes listes », « Tous mes favoris »…
function SecHead({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 13,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 21,
          letterSpacing: '-0.01em',
          color: 'var(--text)',
        }}
      >
        {title}
      </h2>
      {action && (
        <button
          type="button"
          onClick={onAction}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-3)',
          }}
        >
          {action}
        </button>
      )}
    </div>
  )
}

const IcoUtensils = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 2v20M11 2v7M11 2a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3v9" />
  </svg>
)

const IcoListPlus = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h11M3 12h8M3 18h8" />
    <path d="M16 16h6M19 13v6" />
  </svg>
)

const IcoDots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)

// One "⋯" button → a portal menu of card actions (declutters the cards)
function CardActionsMenu({
  buttonRef,
  items,
}: {
  buttonRef: React.RefObject<HTMLButtonElement>
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[]
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const r = buttonRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) })
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      if (buttonRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    document.addEventListener('keydown', onEsc)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open, buttonRef])

  return (
    <>
      <ActionBtn
        btnRef={buttonRef}
        icon={<IcoDots />}
        label="Actions"
        active={open}
        onClick={() => setOpen((v) => !v)}
        small
      />
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: pos.top,
              right: pos.right,
              zIndex: 99999,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--s3)',
              minWidth: 184,
              overflow: 'hidden',
              padding: '4px 0',
              animation: 'scaleIn 140ms var(--ease-out) both',
              transformOrigin: 'top right',
              fontFamily: 'var(--font-body)',
            }}
          >
            {items.map((it) => (
              <button
                key={it.label}
                onClick={() => {
                  setOpen(false)
                  it.onClick()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 14px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  color: it.danger ? 'var(--coral)' : 'var(--text)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = it.danger
                    ? 'var(--coral-pale)'
                    : 'var(--surface)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span
                  style={{ display: 'flex', color: it.danger ? 'var(--coral)' : 'var(--text-3)' }}
                >
                  {it.icon}
                </span>
                {it.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}

// Menu ⋯ d'une ligne-collection (natif) — réutilise CardActionsMenu.
function ListRowMenu({
  onRename,
  onCollab,
  onDelete,
}: {
  onRename: () => void
  onCollab: () => void
  onDelete: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <CardActionsMenu
      buttonRef={ref}
      items={[
        { label: 'Renommer', icon: <IcoPen />, onClick: onRename },
        { label: 'Collaborateurs', icon: <IcoListPlus />, onClick: onCollab },
        { label: 'Supprimer', icon: <IcoTrash />, onClick: onDelete, danger: true },
      ]}
    />
  )
}

function Checkbox({ checked, overlay }: { checked: boolean; overlay?: boolean }) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        flexShrink: 0,
        border: `2px solid ${checked ? 'var(--ember)' : overlay ? 'rgba(255,255,255,0.9)' : 'var(--border-strong)'}`,
        background: checked ? 'var(--ember)' : overlay ? 'rgba(0,0,0,0.25)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 120ms ease',
        marginTop: overlay ? 0 : 15,
        boxShadow: overlay ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
      }}
    >
      {checked && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  )
}

function BulkListModal({
  count,
  lists,
  busy,
  onPick,
  onCreateNew,
  onClose,
}: {
  count: number
  lists: HookListRow[]
  busy: boolean
  onPick: (listId: string) => void
  onCreateNew: () => void
  onClose: () => void
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(25,28,29,0.5)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'overlayIn 180ms ease both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--bg)',
          borderRadius: 'var(--r-2xl)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--s4)',
          overflow: 'hidden',
          opacity: busy ? 0.7 : 1,
          pointerEvents: busy ? 'none' : 'auto',
        }}
      >
        <div style={{ padding: '16px 18px 12px' }}>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Ajouter {count} à une liste
          </h3>
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
          {lists.length === 0 && (
            <p
              style={{
                margin: 0,
                padding: '18px',
                fontSize: 13,
                color: 'var(--text-3)',
                textAlign: 'center',
              }}
            >
              Aucune liste encore.
            </p>
          )}
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => onPick(list.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '13px 18px',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {list.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{list.item_count}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onCreateNew}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '14px 18px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--ember-text)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 700,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ember-light)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <IcoListPlus /> Nouvelle liste
        </button>
      </div>
    </div>
  )
}

function FavCardList({
  fav,
  index,
  note,
  visited,
  onRemove,
  onOpenMap,
  onShare,
  onNote,
  onListsChanged,
  selectMode,
  selected,
  onToggleSelect,
  sourceLabel,
}: {
  fav: FavoriteRow
  index: number
  note: string
  visited?: boolean
  onRemove: () => void
  onOpenMap: () => void
  onShare: () => void
  onNote: () => void
  onListsChanged?: () => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  sourceLabel?: string | null
}) {
  const cuisine = fav.snapshot?.cuisine ?? fav.snapshot?.fsq?.categories?.[0]?.name
  const rating = fav.snapshot?.fsq?.rating
  const openNow = fav.snapshot?.open_now
  const photo = favPhoto(fav)
  const listBtnRef = useRef<HTMLButtonElement>(null)
  const [showLists, setShowLists] = useState(false)
  const primary = selectMode ? onToggleSelect! : onOpenMap
  const nativeFav = useIsNative()

  const actionItems = [
    {
      label: 'Ajouter à une liste',
      icon: <IcoListPlus />,
      onClick: () => setShowLists(true),
    },
    {
      label: note ? 'Modifier la note' : 'Ajouter une note',
      icon: <IcoPen />,
      onClick: onNote,
    },
    { label: 'Partager', icon: <IcoShare />, onClick: onShare },
    { label: 'Retirer', icon: <IcoTrash />, onClick: onRemove, danger: true },
  ]

  // ── App native : ligne « bibliothèque » façon Albo (photo 66 + méta + ⋯) ──
  if (nativeFav) {
    return (
      <div
        className="anim-card-in"
        onClick={selectMode ? onToggleSelect : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          animationDelay: `${index * 30}ms`,
          cursor: selectMode ? 'pointer' : 'default',
        }}
      >
        {selectMode && <Checkbox checked={!!selected} />}

        {/* Photo — repli dégradé + initiale serif */}
        <button
          type="button"
          onClick={primary}
          aria-label={selectMode ? `Sélectionner ${fav.name}` : `Voir ${fav.name} sur la carte`}
          style={{
            position: 'relative',
            width: 66,
            height: 66,
            borderRadius: 15,
            overflow: 'hidden',
            flexShrink: 0,
            background: placeGradient(fav.osm_id),
            border: selected ? '2px solid var(--accent)' : 'none',
            boxShadow: 'var(--s1)',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {photo ? (
            <FavPhoto src={photo} />
          ) : (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              {placeInitial(fav.snapshot?.name ?? fav.name)}
            </span>
          )}
        </button>

        {/* Corps — nom serif + méta */}
        <button
          type="button"
          onClick={primary}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 16.5,
              fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fav.name}
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              marginTop: 5,
              flexWrap: 'wrap',
            }}
          >
            {rating != null && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: 'var(--text)',
                }}
              >
                <span style={{ color: 'var(--star)', display: 'flex' }}>
                  <IcoStar />
                </span>
                {rating.toFixed(1)}
              </span>
            )}
            {cuisine && (
              <>
                {rating != null && <MetaDot />}
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{frCuisine(cuisine)}</span>
              </>
            )}
            {openNow != null && (
              <>
                {(rating != null || cuisine) && <MetaDot />}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: openNow ? 'var(--open)' : 'var(--closed)',
                  }}
                >
                  <span
                    style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}
                  />
                  {openNow ? 'Ouvert' : 'Fermé'}
                </span>
              </>
            )}
            {sourceLabel && (
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>· {sourceLabel}</span>
            )}
            {visited && (
              <span
                title="Déjà testé"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--open)',
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Testé
              </span>
            )}
            {note && (
              <span
                title="Note personnelle"
                style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}
              />
            )}
          </div>
        </button>

        {/* Actions */}
        {!selectMode && (
          <div style={{ flexShrink: 0 }}>
            <CardActionsMenu buttonRef={listBtnRef} items={actionItems} />
          </div>
        )}

        {showLists && (
          <SaveToListPopup
            osmId={fav.osm_id}
            placeSnapshot={fav.snapshot as unknown as Record<string, unknown>}
            anchorRef={listBtnRef}
            onClose={() => {
              setShowLists(false)
              onListsChanged?.()
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className="anim-card-in"
      onClick={selectMode ? onToggleSelect : undefined}
      style={{
        background: selected ? 'var(--ember-light)' : 'var(--bg)',
        borderRadius: 'var(--r-xl)',
        padding: 12,
        display: 'flex',
        gap: 13,
        alignItems: 'center',
        border: `1px solid ${selected ? 'var(--ember)' : 'var(--border)'}`,
        boxShadow: 'var(--s1)',
        animationDelay: `${index * 35}ms`,
        cursor: selectMode ? 'pointer' : 'default',
        transition: 'box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease',
      }}
      onMouseEnter={(e) => {
        if (selectMode) return
        e.currentTarget.style.boxShadow = 'var(--s3)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--s1)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {selectMode && <Checkbox checked={!!selected} />}

      {/* Thumbnail — photo or warm fallback */}
      <button
        type="button"
        onClick={primary}
        aria-label={selectMode ? `Sélectionner ${fav.name}` : `Voir ${fav.name} sur la carte`}
        style={{
          position: 'relative',
          width: 68,
          height: 68,
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          background: placeGradient(fav.osm_id),
          border: 'none',
          flexShrink: 0,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {photo ? (
          <FavPhoto src={photo} />
        ) : (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <IcoUtensils />
          </span>
        )}
      </button>

      {/* Content */}
      <button
        type="button"
        onClick={primary}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <p
          style={{
            margin: '0 0 5px',
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.01em',
            lineHeight: 1.18,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fav.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {rating != null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--ember-text)',
                background: 'var(--ember-light)',
                borderRadius: 'var(--r-pill)',
                padding: '2px 8px',
              }}
            >
              <IcoStar /> {rating.toFixed(1)}
            </span>
          )}
          {cuisine && (
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{frCuisine(cuisine)}</span>
          )}
          {openNow != null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: openNow ? 'var(--open)' : 'var(--closed)',
              }}
            >
              <span
                style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}
              />
              {openNow ? 'Ouvert' : 'Fermé'}
            </span>
          )}
          {note && (
            <span
              title="Note personnelle"
              style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}
            />
          )}
        </div>
      </button>

      {/* Actions — single overflow menu */}
      {!selectMode && (
        <div style={{ flexShrink: 0 }}>
          <CardActionsMenu
            buttonRef={listBtnRef}
            items={[
              {
                label: 'Ajouter à une liste',
                icon: <IcoListPlus />,
                onClick: () => setShowLists(true),
              },
              {
                label: note ? 'Modifier la note' : 'Ajouter une note',
                icon: <IcoPen />,
                onClick: onNote,
              },
              { label: 'Partager', icon: <IcoShare />, onClick: onShare },
              { label: 'Retirer', icon: <IcoTrash />, onClick: onRemove, danger: true },
            ]}
          />
        </div>
      )}

      {showLists && (
        <SaveToListPopup
          osmId={fav.osm_id}
          placeSnapshot={fav.snapshot as unknown as Record<string, unknown>}
          anchorRef={listBtnRef}
          onClose={() => {
            setShowLists(false)
            onListsChanged?.()
          }}
        />
      )}
    </div>
  )
}

// ── Ligne d'un lieu de liste (natif) ──────────────────────
// Même langage « bibliothèque » que FavCardList (vignette 66 + nom serif + méta
// à points), mais actions propres au détail d'une liste : ouvrir sur la carte,
// retirer de la liste.
function ListItemRowNative({
  item,
  index,
  onOpenMap,
  onRemove,
}: {
  item: ListItemEntry
  index: number
  onOpenMap: () => void
  onRemove: () => void
}) {
  const snap = item.place_snapshot as unknown as PlaceCard
  const name = snap?.name ?? item.osm_id
  const cuisine = snap?.cuisine ?? snap?.fsq?.categories?.[0]?.name
  const rating = snap?.fsq?.rating
  const openNow = snap?.open_now
  const ph = snap?.fsq?.photos?.[0]
  const photo = ph
    ? `${ph.prefix}240x${Math.round(240 * (ph.height / ph.width))}${ph.suffix}`
    : (snap?.wikidata?.image_url ?? null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <div
      className="anim-card-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        animationDelay: `${index * 30}ms`,
      }}
    >
      {/* Vignette — repli dégradé + initiale serif */}
      <button
        type="button"
        onClick={onOpenMap}
        aria-label={`Voir ${name} sur la carte`}
        style={{
          position: 'relative',
          width: 66,
          height: 66,
          borderRadius: 15,
          overflow: 'hidden',
          flexShrink: 0,
          background: placeGradient(item.osm_id),
          border: 'none',
          boxShadow: 'var(--s1)',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {photo ? (
          <FavPhoto src={photo} />
        ) : (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            {placeInitial(name)}
          </span>
        )}
      </button>

      {/* Corps — nom serif + méta */}
      <button
        type="button"
        onClick={onOpenMap}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 16.5,
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </p>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 5, flexWrap: 'wrap' }}
        >
          {rating != null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              <span style={{ color: 'var(--star)', display: 'flex' }}>
                <IcoStar />
              </span>
              {rating.toFixed(1)}
            </span>
          )}
          {cuisine && (
            <>
              {rating != null && <MetaDot />}
              <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{frCuisine(cuisine)}</span>
            </>
          )}
          {openNow != null && (
            <>
              {(rating != null || cuisine) && <MetaDot />}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: openNow ? 'var(--open)' : 'var(--closed)',
                }}
              >
                <span
                  style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}
                />
                {openNow ? 'Ouvert' : 'Fermé'}
              </span>
            </>
          )}
        </div>
      </button>

      {/* Actions */}
      <div style={{ flexShrink: 0 }}>
        <CardActionsMenu
          buttonRef={menuBtnRef}
          items={[
            { label: 'Retirer de la liste', icon: <IcoTrash />, onClick: onRemove, danger: true },
          ]}
        />
      </div>
    </div>
  )
}

// ── Fav card — grille ─────────────────────────────────────
function FavCardGrid({
  fav,
  index,
  onRemove,
  onOpenMap,
  onListsChanged,
  selectMode,
  selected,
  onToggleSelect,
}: {
  fav: FavoriteRow
  index: number
  onRemove: () => void
  onOpenMap: () => void
  onListsChanged?: () => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const rating = fav.snapshot?.fsq?.rating
  const cuisine = fav.snapshot?.cuisine ?? fav.snapshot?.fsq?.categories?.[0]?.name
  const photo = favPhoto(fav, 400)
  const listBtnRef = useRef<HTMLButtonElement>(null)
  const [showLists, setShowLists] = useState(false)
  const primary = selectMode ? onToggleSelect! : onOpenMap

  return (
    <div
      className="anim-card-in"
      onClick={selectMode ? onToggleSelect : undefined}
      style={{
        background: selected ? 'var(--ember-light)' : 'var(--bg)',
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        border: `1px solid ${selected ? 'var(--ember)' : 'var(--border)'}`,
        boxShadow: 'var(--s1)',
        animationDelay: `${index * 30}ms`,
        display: 'flex',
        flexDirection: 'column',
        cursor: selectMode ? 'pointer' : 'default',
        transition: 'box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease',
      }}
      onMouseEnter={(e) => {
        if (selectMode) return
        e.currentTarget.style.boxShadow = 'var(--s3)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--s1)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Thumbnail — photo or warm fallback */}
      <button
        type="button"
        onClick={primary}
        aria-label={selectMode ? `Sélectionner ${fav.name}` : `Voir ${fav.name} sur la carte`}
        style={{
          height: 132,
          background: placeGradient(fav.osm_id),
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          position: 'relative',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {photo ? (
          <FavPhoto src={photo} />
        ) : (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <IcoUtensils />
          </span>
        )}
        {/* legibility scrim for the badge */}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.18), transparent 38%)',
            pointerEvents: 'none',
          }}
        />
        {selectMode && (
          <span style={{ position: 'absolute', top: 10, left: 10 }}>
            <Checkbox checked={!!selected} overlay />
          </span>
        )}
        {rating != null && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '3px 9px',
              borderRadius: 'var(--r-pill)',
              fontSize: 11,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.95)',
              color: 'var(--ember-text)',
            }}
          >
            <IcoStar /> {rating.toFixed(1)}
          </span>
        )}
      </button>
      {/* Body */}
      <div style={{ padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={primary}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <p
            style={{
              margin: '0 0 2px',
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fav.name}
          </p>
          {cuisine && (
            <p
              style={{
                margin: 0,
                fontSize: 11.5,
                color: 'var(--text-2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {frCuisine(cuisine)}
            </p>
          )}
        </button>
        {!selectMode && (
          <CardActionsMenu
            buttonRef={listBtnRef}
            items={[
              {
                label: 'Ajouter à une liste',
                icon: <IcoListPlus />,
                onClick: () => setShowLists(true),
              },
              { label: 'Retirer', icon: <IcoTrash />, onClick: onRemove, danger: true },
            ]}
          />
        )}
      </div>

      {showLists && (
        <SaveToListPopup
          osmId={fav.osm_id}
          placeSnapshot={fav.snapshot as unknown as Record<string, unknown>}
          anchorRef={listBtnRef}
          onClose={() => {
            setShowLists(false)
            onListsChanged?.()
          }}
        />
      )}
    </div>
  )
}

// ── Action button helper ──────────────────────────────────
function ActionBtn({
  icon,
  label,
  active,
  activeColor,
  activeBg,
  hoverColor,
  hoverBg,
  onClick,
  small,
  btnRef,
}: {
  icon: React.ReactNode
  label?: string
  active?: boolean
  activeColor?: string
  activeBg?: string
  hoverColor?: string
  hoverBg?: string
  onClick: () => void
  small?: boolean
  btnRef?: React.Ref<HTMLButtonElement>
}) {
  const sz = small ? 28 : 30
  const bg = active ? (activeBg ?? 'var(--accent-light)') : 'var(--surface)'
  const color = active ? (activeColor ?? 'var(--accent)') : 'var(--text-3)'
  const border = active
    ? `1px solid ${activeColor ? activeColor + '44' : 'var(--border-strong)'}`
    : '1px solid var(--border)'
  return (
    <button
      ref={btnRef}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={label}
      aria-label={label}
      style={{
        width: sz,
        height: sz,
        minWidth: 44,
        minHeight: 44,
        borderRadius: 'var(--r-sm)',
        border,
        background: bg,
        color,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 140ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hoverBg ?? activeBg ?? 'var(--cream)'
        e.currentTarget.style.color = hoverColor ?? activeColor ?? 'var(--text)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = bg
        e.currentTarget.style.color = color
      }}
    >
      {icon}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────
function FavoritesPageInner() {
  const { isReady } = useAuthGuard()
  const router = useRouter()

  const [favorites, setFavorites] = useState<FavoriteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>('date_desc')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [favCuisine, setFavCuisine] = useState<string | null>(null)
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set())
  const [favTab, setFavTab] = useState<'all' | 'todo' | 'done'>('all')
  const [toDelete, setToDelete] = useState<FavoriteRow | null>(null)
  const [shareTarget, setShareTarget] = useState<FavoriteRow | null>(null)
  const [noteTarget, setNoteTarget] = useState<FavoriteRow | null>(null)
  // notes: osm_id → texte (state local rafraîchi depuis localStorage)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()
  const isNative = useIsNative()

  const searchParams = useSearchParams()
  const activeListId = searchParams.get('list')

  const {
    lists,
    fetchLists,
    createList,
    updateList,
    deleteList,
    removeItemFromList,
    addItemToList,
  } = useLists()

  // Les posts partagés depuis les réseaux (store unique de l'app — voir useImportsContext).
  const { imports } = useImportsStore()

  // ── Multi-select ──
  const [selectMode, setSelectMode] = useState(false)
  const [pollOpen, setPollOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [showBulkList, setShowBulkList] = useState(false)
  const [bulkCreating, setBulkCreating] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  const toggleSelect = useCallback((osmId: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev)
      if (s.has(osmId)) s.delete(osmId)
      else s.add(osmId)
      return s
    })
  }, [])
  const exitSelect = useCallback(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
    setShowBulkList(false)
  }, [])

  const bulkRemove = async () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBulkBusy(true)
    try {
      const headers = await getAuthHeaders()
      await Promise.all(
        ids.map((id) =>
          apiFetch(`/api/favorites/${encodeURIComponent(id)}`, { method: 'DELETE', headers })
        )
      )
      setFavorites((prev) => prev.filter((f) => !selectedIds.has(f.osm_id)))
    } finally {
      setBulkBusy(false)
      setBulkDeleteOpen(false)
      exitSelect()
    }
  }

  const bulkAddToList = async (listId: string) => {
    const chosen = favorites.filter((f) => selectedIds.has(f.osm_id))
    if (chosen.length === 0) return
    setBulkBusy(true)
    try {
      for (const f of chosen) {
        await addItemToList(listId, f.osm_id, f.snapshot as unknown as Record<string, unknown>)
      }
      fetchLists()
    } finally {
      setBulkBusy(false)
      exitSelect()
    }
  }
  const [showCreateList, setShowCreateList] = useState(false)
  const [editingList, setEditingList] = useState<HookListRow | null>(null)
  const [listItems, setListItems] = useState<ListItemEntry[]>([])
  const [listItemsLoading, setListItemsLoading] = useState(false)
  const [deleteListTarget, setDeleteListTarget] = useState<HookListRow | null>(null)
  const [collabTarget, setCollabTarget] = useState<HookListRow | null>(null)

  const loadFavorites = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const headers = await getAuthHeaders()
      const res = await apiFetch('/api/favorites', { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setFavorites(data.data ?? [])
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isReady) {
      loadFavorites()
      setNotes(getNotes())
      fetchLists()
      // Visited places → powers the "Déjà testé" vs "À essayer" split.
      getAuthHeaders().then((headers) =>
        apiFetch('/api/visits', { headers })
          .then((r) => (r.ok ? r.json() : null))
          .then((j: { data?: { osm_id: string }[] } | null) => {
            if (j?.data) setVisitedIds(new Set(j.data.map((v) => v.osm_id)))
          })
          .catch(() => {})
      )
    }
  }, [isReady, loadFavorites, fetchLists])

  useEffect(() => {
    if (!isReady || !activeListId) {
      setListItems([])
      return
    }
    setListItemsLoading(true)
    getAuthHeaders().then((headers) =>
      apiFetch(`/api/lists/${activeListId}/items`, { headers })
        .then((r) => r.json())
        .then((json) => setListItems(json.data ?? []))
        .catch(() => setListItems([]))
        .finally(() => setListItemsLoading(false))
    )
  }, [isReady, activeListId])

  const sorted = useMemo((): FavoriteRow[] => {
    let arr: FavoriteRow[] = [...favorites]
    if (favTab === 'todo') arr = arr.filter((f) => !visitedIds.has(f.osm_id))
    else if (favTab === 'done') arr = arr.filter((f) => visitedIds.has(f.osm_id))
    if (favCuisine) {
      arr = arr.filter(
        (f) => (f.snapshot?.cuisine ?? f.snapshot?.fsq?.categories?.[0]?.name) === favCuisine
      )
    }
    const q = query.trim().toLowerCase()
    if (q) {
      arr = arr.filter((f) => {
        const cui = f.snapshot?.cuisine ?? f.snapshot?.fsq?.categories?.[0]?.name ?? ''
        return f.name.toLowerCase().includes(q) || frCuisine(cui).toLowerCase().includes(q)
      })
    }
    switch (sortBy) {
      case 'date_asc':
        arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'name':
        arr.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'rating':
        arr.sort((a, b) => (b.snapshot?.fsq?.rating ?? 0) - (a.snapshot?.fsq?.rating ?? 0))
        break
      default:
        arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return arr
  }, [favorites, sortBy, favCuisine, favTab, visitedIds, query])

  // Provenance « vu sur les réseaux » : osm_id → label court (♪ TikTok, etc.).
  const importSourceByOsm = useMemo(() => {
    const m = new Map<string, string>()
    for (const imp of imports) {
      if (!imp.osm_id || m.has(imp.osm_id)) continue
      const label =
        imp.platform === 'tiktok'
          ? '♪ TikTok'
          : imp.platform === 'instagram'
            ? 'Instagram'
            : imp.platform === 'youtube'
              ? 'YouTube'
              : 'Réseaux'
      m.set(imp.osm_id, label)
    }
    return m
  }, [imports])

  if (!isReady)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid var(--bone)',
            borderTop: '2px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )

  const handleRemoveConfirm = async () => {
    if (!toDelete) return
    const headers = await getAuthHeaders()
    await apiFetch(`/api/favorites/${encodeURIComponent(toDelete.osm_id)}`, {
      method: 'DELETE',
      headers,
    })
    setFavorites((prev) => prev.filter((f) => f.osm_id !== toDelete.osm_id))
    setToDelete(null)
  }

  const activeList = activeListId ? lists.find((l) => l.id === activeListId) : null

  // Featured "coup de cœur" — best-rated saved spot (editorial hero)
  const featured =
    !activeListId && favorites.length > 0
      ? [...favorites].sort(
          (a, b) => (b.snapshot?.fsq?.rating ?? 0) - (a.snapshot?.fsq?.rating ?? 0)
        )[0]
      : null

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {!isNative && <PageHeader current="Enregistrés" />}

      <main style={{ flex: 1 }}>
        <div
          style={{
            maxWidth: 660,
            margin: '0 auto',
            padding: isNative
              ? 'calc(var(--safe-top) + 16px) 16px calc(var(--safe-bottom) + 88px)'
              : isMobile
                ? '24px 16px 80px'
                : '36px 20px 80px',
          }}
        >
          {/* ── En-tête ── */}
          {isNative ? (
            !activeListId && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  animation: 'fadeUp 280ms var(--ease-out) both',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h1
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: 34,
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      color: 'var(--text)',
                    }}
                  >
                    Mes adresses
                  </h1>
                  <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
                    {loading
                      ? 'Chargement…'
                      : `${favorites.length} lieu${favorites.length !== 1 ? 'x' : ''} · ${lists.length} liste${lists.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    aria-label="Rechercher"
                    onClick={() => searchInputRef.current?.focus()}
                    style={icoBtnStyle}
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3-3" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label={viewMode === 'grid' ? 'Vue liste' : 'Vue grille'}
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    style={{
                      ...icoBtnStyle,
                      background: viewMode === 'grid' ? 'var(--accent)' : 'var(--surface)',
                      color: viewMode === 'grid' ? '#fff' : 'var(--text-2)',
                      borderColor: viewMode === 'grid' ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          ) : (
            <div style={{ marginBottom: 24, animation: 'fadeUp 280ms var(--ease-out) both' }}>
              <h1
                style={{
                  margin: '0 0 4px',
                  fontFamily: 'var(--font-display)',
                  fontSize: 26,
                  fontWeight: 400,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.1,
                  color: 'var(--ink)',
                }}
              >
                Enregistrés
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-60)' }}>
                {loading
                  ? 'Chargement…'
                  : `${favorites.length} restaurant${favorites.length !== 1 ? 's' : ''} · ${lists.length} liste${lists.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          )}

          {/* ── Barre de recherche (natif) ── */}
          {isNative && !activeListId && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 46,
                margin: '16px 0 4px',
                padding: '0 15px',
                borderRadius: 15,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-4)"
                strokeWidth="1.8"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" />
              </svg>
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chercher un lieu, une liste…"
                aria-label="Chercher"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  color: 'var(--text)',
                }}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Effacer"
                  onClick={() => setQuery('')}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-4)',
                    display: 'flex',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* ── Ruban de filtres (natif) : états + cuisines fusionnés ── */}
          {isNative &&
            !activeListId &&
            !loading &&
            favorites.length > 0 &&
            (() => {
              const stateChips: { key: 'all' | 'todo' | 'done'; label: string }[] = [
                { key: 'all', label: 'Tout' },
                { key: 'todo', label: 'À tester' },
                { key: 'done', label: 'Testés' },
              ]
              const counts = new Map<string, number>()
              favorites.forEach((f) => {
                const c = f.snapshot?.cuisine ?? f.snapshot?.fsq?.categories?.[0]?.name
                if (c) counts.set(c, (counts.get(c) ?? 0) + 1)
              })
              const topCuisines = [...counts.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([c]) => c)
              return (
                <div
                  className="no-scrollbar"
                  style={{
                    display: 'flex',
                    gap: 8,
                    overflowX: 'auto',
                    margin: '14px 0 6px',
                    paddingBottom: 2,
                  }}
                >
                  {stateChips.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setFavTab(c.key)}
                      style={chipStyle(favTab === c.key)}
                    >
                      {c.label}
                    </button>
                  ))}
                  {topCuisines.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFavCuisine(favCuisine === c ? null : c)}
                      style={chipStyle(favCuisine === c)}
                    >
                      {frCuisine(c)}
                    </button>
                  ))}
                </div>
              )
            })()}

          {/* Lancer un sondage de groupe (natif) */}
          {isNative && !activeListId && !loading && favorites.length >= 2 && (
            <button
              onClick={() => setPollOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '12px',
                margin: '10px 0 4px',
                borderRadius: 14,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                boxShadow: 'var(--s1)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 14.5,
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              🗳️ Lancer un sondage de groupe
            </button>
          )}

          {/* « Vus sur les réseaux » — full-bleed, garde son propre en-tête. */}
          {!activeListId && (
            <div style={{ margin: isNative ? '18px -16px 0' : '0 -16px' }}>
              <ImportsRow imports={imports} />
            </div>
          )}

          {/* Hero — coup de cœur (editorial, web uniquement) */}
          {featured &&
            !loading &&
            !isNative &&
            (() => {
              const photo = favPhoto(featured, 800)
              const rating = featured.snapshot?.fsq?.rating
              const cuisine =
                featured.snapshot?.cuisine ?? featured.snapshot?.fsq?.categories?.[0]?.name
              const michelin =
                featured.snapshot?.osm_enriched?.michelin ??
                featured.snapshot?.wikidata?.michelin_stars ??
                0
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (featured.snapshot) setPendingSelect(featured.snapshot)
                    router.push(
                      `/?select=${encodeURIComponent(featured.osm_id)}&lat=${featured.lat}&lon=${featured.lon}`
                    )
                  }}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 210,
                    borderRadius: 'var(--r-2xl)',
                    overflow: 'hidden',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: 28,
                    boxShadow: 'var(--s3)',
                    backgroundImage: photo ? `url("${photo}")` : undefined,
                    background: photo ? undefined : placeGradient(featured.osm_id),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    animation: 'fadeUp 320ms var(--ease-out) both',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(105deg, rgba(15,11,8,0.5), transparent 55%), linear-gradient(transparent 38%, rgba(15,11,8,0.86))',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 10.5,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      padding: '5px 11px',
                      borderRadius: 'var(--r-pill)',
                      background: 'rgba(255,255,255,0.95)',
                      color: 'var(--ember-text)',
                    }}
                  >
                    ✦ Ton top
                  </span>
                  <div
                    style={{
                      position: 'absolute',
                      left: 18,
                      right: 18,
                      bottom: 16,
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontStyle: 'italic',
                        fontSize: 12.5,
                        color: 'rgba(255,255,255,0.85)',
                        marginBottom: 5,
                      }}
                    >
                      Le coup de cœur de ta collection
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        fontSize: 26,
                        letterSpacing: '-0.015em',
                        color: '#fff',
                        lineHeight: 1.1,
                        textShadow: '0 2px 14px rgba(0,0,0,0.4)',
                      }}
                    >
                      {featured.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 7,
                        flexWrap: 'wrap',
                      }}
                    >
                      {rating != null && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontWeight: 700,
                            fontSize: 13,
                            color: 'var(--star)',
                          }}
                        >
                          <IcoStar /> {rating.toFixed(1)}
                        </span>
                      )}
                      {michelin > 0 && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--star)',
                          }}
                        >
                          {Array.from({ length: michelin }).map((_, i) => (
                            <IcoStar key={i} />
                          ))}{' '}
                          Michelin
                        </span>
                      )}
                      {cuisine && (
                        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.82)' }}>
                          {frCuisine(cuisine)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })()}

          {/* Controls (web — natif utilise les chips) */}
          {!loading && !activeListId && !isNative && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                animation: 'fadeUp 280ms var(--ease-out) 40ms both',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--ink-40)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Tous enregistrés · {sorted.length}
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
                  aria-pressed={selectMode}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 'var(--r-md)',
                    border: `1px solid ${selectMode ? 'var(--accent)' : 'var(--border)'}`,
                    background: selectMode ? 'var(--accent)' : 'var(--white)',
                    color: selectMode ? 'var(--on-accent)' : 'var(--text-2)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {selectMode ? 'Annuler' : 'Sélectionner'}
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  aria-label="Trier par"
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--white)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="date_desc">Récent</option>
                  <option value="date_asc">Ancien</option>
                  <option value="name">A→Z</option>
                  <option value="rating">Note</option>
                </select>
                <div
                  style={{
                    display: 'flex',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    background: 'var(--surface)',
                  }}
                >
                  {(['list', 'grid'] as ViewMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      aria-label={m === 'list' ? 'Vue liste' : 'Vue grille'}
                      aria-pressed={viewMode === m}
                      style={{
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        background: viewMode === m ? 'var(--accent)' : 'transparent',
                        color: viewMode === m ? 'var(--on-accent)' : 'var(--text-2)',
                        cursor: 'pointer',
                        transition: 'all 120ms',
                      }}
                    >
                      {m === 'list' ? <IcoList /> : <IcoGrid />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mes listes — grille (web) / lignes-collections façon Albo (natif) */}
          {!activeListId && lists.length > 0 && isNative && (
            <div
              style={{ margin: '26px 0 8px', animation: 'fadeUp 280ms var(--ease-out) 20ms both' }}
            >
              <SecHead title="Mes listes" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {lists.map((list, i) => (
                  <React.Fragment key={list.id}>
                    {i > 0 && (
                      <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                    )}
                    <ListCard
                      list={list}
                      variant="row"
                      onClick={() => router.push(`/favorites?list=${list.id}`)}
                      menu={
                        <ListRowMenu
                          onRename={() => setEditingList(list)}
                          onCollab={() => setCollabTarget(list)}
                          onDelete={() => setDeleteListTarget(list)}
                        />
                      }
                    />
                  </React.Fragment>
                ))}
                <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                <NewListCard variant="row" onClick={() => setShowCreateList(true)} />
              </div>
            </div>
          )}
          {!activeListId && lists.length > 0 && !isNative && (
            <div style={{ marginBottom: 32, animation: 'fadeUp 280ms var(--ease-out) 20ms both' }}>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--ink-40)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Mes listes
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {lists.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    onClick={() => router.push(`/favorites?list=${list.id}`)}
                  />
                ))}
                <NewListCard onClick={() => setShowCreateList(true)} />
              </div>
            </div>
          )}
          {!activeListId && lists.length === 0 && !loading && (
            <div style={{ marginBottom: 24 }}>
              <NewListCard
                variant={isNative ? 'row' : 'card'}
                onClick={() => setShowCreateList(true)}
              />
            </div>
          )}

          {/* List detail view */}
          {activeListId &&
            activeList &&
            (isNative ? (
              /* ── App native : détail d'une liste façon Albo ── */
              <div style={{ animation: 'fadeUp 280ms var(--ease-out) both' }}>
                {/* Barre supérieure : retour + actions de liste */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 18,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => router.push('/favorites')}
                    aria-label="Retour aux favoris"
                    style={icoBtnStyle}
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  {!activeList.is_collaborator && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        aria-label="Renommer la liste"
                        onClick={() => setEditingList(activeList)}
                        style={icoBtnStyle}
                      >
                        <IcoPen />
                      </button>
                      <button
                        type="button"
                        aria-label="Collaborateurs"
                        onClick={() => setCollabTarget(activeList)}
                        style={icoBtnStyle}
                      >
                        <IcoListPlus />
                      </button>
                      <button
                        type="button"
                        aria-label="Supprimer la liste"
                        onClick={() => setDeleteListTarget(activeList)}
                        style={icoBtnStyle}
                      >
                        <IcoTrash />
                      </button>
                    </div>
                  )}
                </div>

                {/* Masthead — nom de la liste en grand serif */}
                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: 30,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.05,
                      color: 'var(--text)',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    {activeList.name}
                  </h1>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
                    {activeList.item_count} lieu{activeList.item_count !== 1 ? 'x' : ''} ·{' '}
                    {activeList.is_collaborator
                      ? `Partagée par ${activeList.shared_by ?? 'un ami'}`
                      : activeList.visibility === 'public'
                        ? 'Publique'
                        : activeList.visibility === 'friends'
                          ? 'Amis'
                          : 'Privée'}
                  </p>
                  {activeList.description && (
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: 13.5,
                        color: 'var(--text-2)',
                        lineHeight: 1.6,
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                      }}
                    >
                      {activeList.description}
                    </p>
                  )}
                  {!activeList.is_collaborator &&
                    activeList.collaborators &&
                    activeList.collaborators.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                        <div style={{ display: 'flex' }}>
                          {activeList.collaborators.slice(0, 4).map((c, i) => (
                            <div key={c.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                              <Avatar
                                name={c.display_name}
                                src={c.avatar_url}
                                id={c.id}
                                size={26}
                              />
                            </div>
                          ))}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                          {activeList.collaborators.length} collaborateur
                          {activeList.collaborators.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                </div>

                <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />

                {/* Lieux de la liste — lignes « bibliothèque » */}
                {listItemsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[1, 2].map((i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                        <div
                          className="skeleton"
                          style={{ width: 66, height: 66, borderRadius: 15, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            className="skeleton"
                            style={{ height: 14, width: '60%', borderRadius: 6, marginBottom: 8 }}
                          />
                          <div
                            className="skeleton"
                            style={{ height: 11, width: '40%', borderRadius: 6 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : listItems.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      padding: '34px 24px',
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 18,
                        background: 'var(--surface-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-3)',
                      }}
                    >
                      <IcoListPlus />
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 18,
                          fontWeight: 600,
                          color: 'var(--text)',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        Cette liste attend ses adresses
                      </div>
                      <p
                        style={{
                          margin: '6px 0 0',
                          fontSize: 13.5,
                          color: 'var(--text-2)',
                          lineHeight: 1.5,
                        }}
                      >
                        Ouvre un restaurant et ajoute-le à cette liste pour le retrouver ici.
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/')}
                      style={{
                        background: 'var(--accent)',
                        color: 'var(--on-accent)',
                        border: 'none',
                        borderRadius: 999,
                        padding: '11px 20px',
                        fontSize: 13.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Explorer la carte
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {listItems.map((item, i) => {
                      const snap = item.place_snapshot as unknown as PlaceCard
                      return (
                        <ListItemRowNative
                          key={item.id}
                          item={item}
                          index={i}
                          onOpenMap={() => {
                            if (snap?.lat != null && snap?.lon != null) {
                              setPendingSelect(snap)
                              router.push(
                                `/?select=${encodeURIComponent(item.osm_id)}&lat=${snap.lat}&lon=${snap.lon}`
                              )
                            }
                          }}
                          onRemove={async () => {
                            await removeItemFromList(activeListId, item.osm_id)
                            setListItems((prev) => prev.filter((it) => it.osm_id !== item.osm_id))
                          }}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <button
                  onClick={() => router.push('/favorites')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 14,
                    color: 'var(--text-2)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: 20,
                    fontFamily: 'inherit',
                  }}
                >
                  ← Enregistrés
                </button>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 24,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2
                      style={{
                        margin: '0 0 4px',
                        fontFamily: 'var(--font-display)',
                        fontSize: 26,
                        fontWeight: 400,
                        letterSpacing: '-0.04em',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                      }}
                    >
                      {activeList.name}
                    </h2>
                    {activeList.description && (
                      <p
                        style={{
                          margin: '0 0 6px',
                          fontSize: 13,
                          color: 'var(--text-3)',
                          lineHeight: 1.6,
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                        }}
                      >
                        {activeList.description}
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>
                      {activeList.item_count} lieu{activeList.item_count !== 1 ? 'x' : ''} ·{' '}
                      {activeList.is_collaborator
                        ? `Partagée par ${activeList.shared_by ?? 'un ami'}`
                        : activeList.visibility === 'public'
                          ? 'Publique'
                          : activeList.visibility === 'friends'
                            ? 'Amis'
                            : 'Privée'}
                    </p>
                    {!activeList.is_collaborator &&
                      activeList.collaborators &&
                      activeList.collaborators.length > 0 && (
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}
                        >
                          <div style={{ display: 'flex' }}>
                            {activeList.collaborators.slice(0, 4).map((c, i) => (
                              <div key={c.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                                <Avatar
                                  name={c.display_name}
                                  src={c.avatar_url}
                                  id={c.id}
                                  size={26}
                                />
                              </div>
                            ))}
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {activeList.collaborators.length} collaborateur
                            {activeList.collaborators.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                  </div>
                  {!activeList.is_collaborator && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => setCollabTarget(activeList)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 'var(--r-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--white)',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--text-2)',
                          fontFamily: 'inherit',
                        }}
                      >
                        Inviter
                      </button>
                      <button
                        onClick={() => setEditingList(activeList)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 'var(--r-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--white)',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--text-2)',
                          fontFamily: 'inherit',
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setDeleteListTarget(activeList)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 'var(--r-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--coral-pale)',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--coral)',
                          fontFamily: 'inherit',
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
                {listItemsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="skeleton"
                        style={{ height: 80, borderRadius: 'var(--r-xl)' }}
                      />
                    ))}
                  </div>
                ) : listItems.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      padding: '34px 24px',
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 18,
                        background: 'var(--surface-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-3)',
                      }}
                    >
                      <IcoListPlus />
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 18,
                          fontWeight: 600,
                          color: 'var(--text)',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        Cette liste attend ses adresses
                      </div>
                      <p
                        style={{
                          margin: '6px 0 0',
                          fontSize: 13.5,
                          color: 'var(--text-2)',
                          lineHeight: 1.5,
                        }}
                      >
                        Ouvre un restaurant et ajoute-le à cette liste pour le retrouver ici.
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/')}
                      style={{
                        background: 'var(--accent)',
                        color: 'var(--on-accent)',
                        border: 'none',
                        borderRadius: 999,
                        padding: '11px 20px',
                        fontSize: 13.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Explorer la carte
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {listItems.map((item) => {
                      const snap = item.place_snapshot as {
                        name?: string
                        lat?: number
                        lon?: number
                      }
                      return (
                        <div
                          key={item.id}
                          style={{
                            background: 'var(--white)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--r-xl)',
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                margin: '0 0 3px',
                                fontFamily: 'var(--font-display)',
                                fontSize: 15,
                                fontWeight: 400,
                                letterSpacing: '-0.02em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {snap.name ?? item.osm_id}
                            </p>
                            <button
                              onClick={() => {
                                if (snap.lat != null && snap.lon != null) {
                                  router.push(
                                    `/?select=${encodeURIComponent(item.osm_id)}&lat=${snap.lat}&lon=${snap.lon}`
                                  )
                                }
                              }}
                              style={{
                                padding: 0,
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontSize: 11,
                                color: 'var(--text-3)',
                                fontFamily: 'inherit',
                              }}
                            >
                              Voir sur la carte →
                            </button>
                          </div>
                          <button
                            onClick={async () => {
                              await removeItemFromList(activeListId, item.osm_id)
                              setListItems((prev) => prev.filter((i) => i.osm_id !== item.osm_id))
                            }}
                            aria-label="Retirer de la liste"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 'var(--r-sm)',
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-3)',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--coral-pale)'
                              e.currentTarget.style.color = 'var(--coral)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'var(--surface)'
                              e.currentTarget.style.color = 'var(--text-3)'
                            }}
                          >
                            <IcoX />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

          {/* Skeleton */}
          {loading && !activeListId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: 100, borderRadius: 'var(--r-xl)' }}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {fetchError && !loading && (
            <div role="alert" style={{ textAlign: 'center', padding: '40px 0' }}>
              <p
                style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--ink-80)' }}
              >
                Impossible de charger les lieux
              </p>
              <button
                onClick={loadFavorites}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--r-pill)',
                  border: '1px solid var(--border)',
                  background: 'var(--coral-pale)',
                  color: 'var(--coral)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !activeListId && !favorites.length && (
            <div
              className="anim-fade-up"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '72px 24px',
                textAlign: 'center',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-2xl)',
                boxShadow: 'var(--s1)',
              }}
            >
              {/* SVG map pin with terracotta heart */}
              <svg
                width="72"
                height="72"
                viewBox="0 0 72 72"
                fill="none"
                style={{ marginBottom: 20 }}
              >
                <circle cx="36" cy="36" r="36" fill="var(--accent-light)" />
                <path
                  d="M36 18C28.268 18 22 24.268 22 32c0 10 14 24 14 24s14-14 14-24c0-7.732-6.268-14-14-14z"
                  fill="var(--accent)"
                  opacity="0.2"
                />
                <path
                  d="M36 20C29.373 20 24 25.373 24 32c0 9.5 12 22 12 22s12-12.5 12-22c0-6.627-5.373-12-12-12z"
                  fill="var(--accent)"
                />
                <path
                  d="M36 27.6c-1.2-1.45-3.1-1.96-4.6-.97-1.5.99-1.9 3.04-.93 4.5.62.95 2.46 2.7 4.13 4.2.6.55 1.2.55 1.8 0 1.67-1.5 3.51-3.25 4.13-4.2.97-1.46.57-3.51-.93-4.5-1.5-.99-3.4-.48-4.6.97z"
                  fill="var(--ember)"
                />
              </svg>
              <h2
                style={{
                  margin: '0 0 8px',
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  fontWeight: 400,
                  letterSpacing: '-0.03em',
                  color: 'var(--text)',
                }}
              >
                Vos coups de cœur vous attendent
              </h2>
              <p
                style={{
                  margin: '0 0 28px',
                  color: 'var(--text-2)',
                  fontSize: 13.5,
                  lineHeight: 1.7,
                  maxWidth: 320,
                }}
              >
                Touchez le cœur sur n&apos;importe quel restaurant
                <br />
                pour le garder précieusement ici.
              </p>
              <Link
                href="/"
                className="btn-ember"
                style={{
                  display: 'inline-flex',
                  width: 'auto',
                  textDecoration: 'none',
                }}
              >
                Explorer la carte →
              </Link>
            </div>
          )}

          {/* En-tête serif « Tous mes favoris » (natif) */}
          {isNative && !activeListId && !loading && favorites.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div style={{ height: 1, background: 'var(--border)', margin: '0 0 18px' }} />
              <SecHead title="Tous mes favoris" action={`${sorted.length} ›`} />
            </div>
          )}

          {/* Liste — masquée quand une liste est ouverte (sinon les enregistrés
              sans liste s'affichaient sous les items de la liste) */}
          {!activeListId &&
            (viewMode === 'list' ? (
              <div
                style={
                  isNative
                    ? { display: 'flex', flexDirection: 'column', gap: 11 }
                    : { display: 'flex', flexDirection: 'column', gap: 10 }
                }
              >
                {sorted.length === 0 && favorites.length > 0 && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      padding: '36px 20px',
                      color: 'var(--text-3)',
                      fontSize: 13.5,
                      lineHeight: 1.6,
                    }}
                  >
                    {favTab === 'todo'
                      ? 'Tous tes favoris sont déjà testés 🎉'
                      : favTab === 'done'
                        ? 'Rien de testé pour l’instant. Logue une visite depuis une fiche.'
                        : 'Aucun favori ici.'}
                  </div>
                )}
                {sorted.map((fav, i) => (
                  <FavCardList
                    key={fav.id}
                    fav={fav}
                    index={i}
                    visited={visitedIds.has(fav.osm_id)}
                    note={notes[fav.osm_id] ?? ''}
                    onRemove={() => setToDelete(fav)}
                    onOpenMap={() => {
                      if (fav.snapshot) setPendingSelect(fav.snapshot)
                      router.push(
                        `/?select=${encodeURIComponent(fav.osm_id)}&lat=${fav.lat}&lon=${fav.lon}`
                      )
                    }}
                    onShare={() => setShareTarget(fav)}
                    onNote={() => setNoteTarget(fav)}
                    onListsChanged={fetchLists}
                    selectMode={selectMode}
                    selected={selectedIds.has(fav.osm_id)}
                    onToggleSelect={() => toggleSelect(fav.osm_id)}
                    sourceLabel={importSourceByOsm.get(fav.osm_id) ?? null}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(200px,1fr))',
                  gap: 12,
                }}
              >
                {sorted.map((fav, i) => (
                  <FavCardGrid
                    key={fav.id}
                    fav={fav}
                    index={i}
                    onRemove={() => setToDelete(fav)}
                    onOpenMap={() => {
                      if (fav.snapshot) setPendingSelect(fav.snapshot)
                      router.push(
                        `/?select=${encodeURIComponent(fav.osm_id)}&lat=${fav.lat}&lon=${fav.lon}`
                      )
                    }}
                    onListsChanged={fetchLists}
                    selectMode={selectMode}
                    selected={selectedIds.has(fav.osm_id)}
                    onToggleSelect={() => toggleSelect(fav.osm_id)}
                  />
                ))}
              </div>
            ))}
        </div>
      </main>

      {/* Selection action bar */}
      {selectMode && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: isMobile ? 'calc(56px + var(--safe-bottom) + 12px)' : 24,
            zIndex: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--text)',
            color: 'var(--bg)',
            borderRadius: 'var(--r-pill)',
            padding: '8px 8px 8px 18px',
            boxShadow: 'var(--s4)',
            animation: 'fadeUp 200ms var(--ease-out) both',
            maxWidth: 'calc(100vw - 24px)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => selectedIds.size && setShowBulkList(true)}
            disabled={!selectedIds.size}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 'var(--r-pill)',
              border: 'none',
              background: 'var(--ember)',
              color: 'var(--on-accent)',
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              cursor: selectedIds.size ? 'pointer' : 'default',
              opacity: selectedIds.size ? 1 : 0.45,
              whiteSpace: 'nowrap',
            }}
          >
            <IcoListPlus /> Ajouter à une liste
          </button>
          <button
            onClick={() => selectedIds.size && setBulkDeleteOpen(true)}
            disabled={!selectedIds.size}
            aria-label="Supprimer la sélection"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 'var(--r-pill)',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)',
              color: '#ff9a9a',
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              cursor: selectedIds.size ? 'pointer' : 'default',
              opacity: selectedIds.size ? 1 : 0.45,
            }}
          >
            <IcoTrash />
          </button>
        </div>
      )}

      {bulkDeleteOpen && (
        <DeleteModal
          name={`${selectedIds.size} enregistré${selectedIds.size > 1 ? 's' : ''}`}
          onConfirm={bulkRemove}
          onCancel={() => setBulkDeleteOpen(false)}
        />
      )}

      {showBulkList && (
        <BulkListModal
          count={selectedIds.size}
          lists={lists}
          busy={bulkBusy}
          onPick={bulkAddToList}
          onCreateNew={() => {
            setShowBulkList(false)
            setBulkCreating(true)
          }}
          onClose={() => setShowBulkList(false)}
        />
      )}

      {bulkCreating && (
        <CreateListModal
          onSave={async (name, desc, pub) => {
            const created = await createList(name, desc, pub)
            setBulkCreating(false)
            await bulkAddToList(created.id)
          }}
          onClose={() => setBulkCreating(false)}
        />
      )}

      {toDelete && (
        <DeleteModal
          name={toDelete.name}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setToDelete(null)}
        />
      )}
      {shareTarget && <ShareDrawer fav={shareTarget} onClose={() => setShareTarget(null)} />}
      {pollOpen && <PollCreate onClose={() => setPollOpen(false)} />}
      {noteTarget && (
        <NoteDrawer
          fav={noteTarget}
          onClose={() => setNoteTarget(null)}
          onSaved={(n) => {
            setNotes((prev) =>
              n ? { ...prev, [noteTarget.osm_id]: n } : { ...prev, [noteTarget.osm_id]: '' }
            )
          }}
        />
      )}

      {showCreateList && (
        <CreateListModal
          onSave={async (name, desc, pub) => {
            await createList(name, desc, pub)
            setShowCreateList(false)
          }}
          onClose={() => setShowCreateList(false)}
        />
      )}

      {editingList && (
        <CreateListModal
          initial={editingList}
          onSave={async (name, desc, visibility) => {
            await updateList(editingList.id, { name, description: desc, visibility })
            setEditingList(null)
          }}
          onClose={() => setEditingList(null)}
        />
      )}

      {collabTarget && (
        <CollaboratorsSheet
          listId={collabTarget.id}
          listName={collabTarget.name}
          onClose={() => setCollabTarget(null)}
          onChanged={fetchLists}
        />
      )}

      {deleteListTarget && (
        <DeleteModal
          name={deleteListTarget.name}
          onConfirm={async () => {
            await deleteList(deleteListTarget.id)
            setDeleteListTarget(null)
            router.push('/favorites')
          }}
          onCancel={() => setDeleteListTarget(null)}
        />
      )}

      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
        @keyframes cardIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>

      {!isNative && <GlobalFooter />}
    </div>
  )
}

export default function FavoritesPage() {
  return (
    <Suspense>
      <FavoritesPageInner />
    </Suspense>
  )
}
