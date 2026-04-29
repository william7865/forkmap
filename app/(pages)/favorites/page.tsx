// ============================================================
// app/(pages)/favorites/page.tsx — Lieux sauvegardés
// Refonte complète : partage, notes, filtres cuisine, grid/list
// ============================================================
'use client'

import React, { Suspense, useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { FavoriteRow } from '@/types'
import { useAuthGuard } from '@/lib/hooks/useAuthGuard'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { PageHeader, GlobalFooter } from '@/components/ui/PageLayout'
import { getNotes, getNote, saveNote } from '@/components/place/NoteModal'
import { apiFetch } from '@/lib/api'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import { useLists, type ListRow as HookListRow } from '@/lib/hooks/useLists'
import { ListCard, NewListCard } from '@/components/lists/ListCard'
import { CreateListModal } from '@/components/lists/CreateListModal'

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
const IcoMap = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
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
          background: 'rgba(14,14,13,0.45)',
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
          background: 'var(--white)',
          borderRadius: 'var(--r-xl)',
          padding: '28px',
          maxWidth: 360,
          width: '100%',
          boxShadow: '0 32px 80px rgba(14,14,13,0.22)',
          animation: 'scaleIn 200ms var(--ease-spring) both',
          fontFamily: 'var(--font-body)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
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
          sauvegardés.
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
              boxShadow: '0 4px 12px rgba(217,79,61,0.25)',
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
          background: 'rgba(14,14,13,0.45)',
          backdropFilter: 'blur(6px)',
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--white)',
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxWidth: 520,
          padding: '20px 20px 32px',
          boxShadow: '0 -16px 48px rgba(14,14,13,0.18)',
          animation: 'slideUp 240ms var(--ease-out) both',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--bone)',
            margin: '0 auto 16px',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--accent-light)',
              border: '1px solid rgba(45,122,85,0.2)',
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
                border: '1px solid rgba(217,79,61,0.25)',
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
              background: saved ? 'var(--green)' : 'var(--accent)',
              color: 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              boxShadow: 'var(--s-forest)',
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
  const text = `🍴 ${fav.name}${fav.snapshot?.cuisine ? ` · ${fav.snapshot.cuisine}` : ''} — trouvé sur Forkmap`
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
          background: 'rgba(14,14,13,0.45)',
          backdropFilter: 'blur(6px)',
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--white)',
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxWidth: 520,
          padding: '20px 20px 32px',
          boxShadow: '0 -16px 48px rgba(14,14,13,0.18)',
          animation: 'slideUp 240ms var(--ease-out) both',
          fontFamily: 'var(--font-body)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
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
              bg: 'rgba(37,211,102,0.08)',
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
            border: `1px solid ${copied ? 'rgba(45,122,85,0.4)' : 'var(--border)'}`,
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
              background: copied ? 'var(--accent-light)' : 'var(--white)',
              border: `1px solid ${copied ? 'rgba(45,122,85,0.4)' : 'var(--border)'}`,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              color: copied ? 'var(--green)' : 'var(--text-2)',
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

// ── Shared gradient utilities for fav cards ───────────────
const FAV_GRADIENTS: [string, string][] = [
  ['#1c3a28', '#4a8c5c'],
  ['#3a1c1c', '#8c4a4a'],
  ['#1c2a3a', '#4a5c8c'],
  ['#3a2d1c', '#8c6c3a'],
  ['#2d1c3a', '#6c4a8c'],
  ['#1c3a3a', '#3a8c8c'],
]
function thumbGradient(osmId: string): string {
  const idx = osmId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % FAV_GRADIENTS.length
  const [from, to] = FAV_GRADIENTS[idx]
  return `linear-gradient(135deg, ${from}, ${to})`
}

// ── Fav card — liste ──────────────────────────────────────
function FavCardList({
  fav,
  index,
  note,
  listNames = [],
  onRemove,
  onOpenMap,
  onShare,
  onNote,
}: {
  fav: FavoriteRow
  index: number
  note: string
  listNames?: string[]
  onRemove: () => void
  onOpenMap: () => void
  onShare: () => void
  onNote: () => void
}) {
  const cuisine = fav.snapshot?.cuisine ?? fav.snapshot?.fsq?.categories?.[0]?.name
  const rating = fav.snapshot?.fsq?.rating
  const meta = [cuisine, rating != null ? `★ ${rating.toFixed(1)}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className="anim-card-in"
      style={{
        background: 'var(--white)',
        borderRadius: 'var(--r-xl)',
        padding: 12,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        boxShadow: 'var(--s1)',
        animationDelay: `${index * 35}ms`,
      }}
    >
      {/* Thumbnail */}
      <button
        type="button"
        onClick={onOpenMap}
        aria-label={`Voir ${fav.name} sur la carte`}
        style={{
          width: 52,
          height: 52,
          borderRadius: 'var(--r-lg)',
          background: thumbGradient(fav.osm_id),
          border: 'none',
          flexShrink: 0,
          cursor: 'pointer',
        }}
      />

      {/* Content */}
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
            margin: '0 0 2px',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fav.name}
        </p>
        {meta && <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--ink-60)' }}>{meta}</p>}
        {/* List badges */}
        {listNames.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {listNames.map((n) => (
              <span
                key={n}
                style={{
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 999,
                  letterSpacing: '0.03em',
                }}
              >
                {n}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flexShrink: 0 }}>
        <ActionBtn
          icon={<IcoPen />}
          label="Note"
          active={!!note}
          activeColor="var(--accent)"
          activeBg="var(--accent-light)"
          onClick={onNote}
          small
        />
        <ActionBtn icon={<IcoShare />} label="Partager" onClick={onShare} small />
        <ActionBtn
          icon={<IcoTrash />}
          label="Retirer"
          hoverColor="var(--coral)"
          hoverBg="var(--coral-pale)"
          onClick={onRemove}
          small
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
}: {
  fav: FavoriteRow
  index: number
  onRemove: () => void
  onOpenMap: () => void
}) {
  const rating = fav.snapshot?.fsq?.rating

  return (
    <div
      className="anim-card-in"
      style={{
        background: 'var(--white)',
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--s1)',
        animationDelay: `${index * 30}ms`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Thumbnail */}
      <button
        type="button"
        onClick={onOpenMap}
        aria-label={`Voir ${fav.name} sur la carte`}
        style={{
          height: 90,
          background: thumbGradient(fav.osm_id),
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          position: 'relative',
          padding: 0,
        }}
      >
        {rating != null && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '3px 8px',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.18)',
              color: '#ffffff',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            <IcoStar /> {rating.toFixed(1)}
          </span>
        )}
      </button>
      {/* Body */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
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
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fav.name}
          </p>
        </button>
        <ActionBtn
          icon={<IcoTrash />}
          label="Retirer"
          hoverColor="var(--coral)"
          hoverBg="var(--coral-pale)"
          onClick={onRemove}
          small
        />
      </div>
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
}) {
  const sz = small ? 28 : 30
  const bg = active ? (activeBg ?? 'var(--accent-light)') : 'var(--surface)'
  const color = active ? (activeColor ?? 'var(--accent)') : 'var(--text-3)'
  const border = active
    ? `1px solid ${activeColor ? activeColor + '44' : 'rgba(45,122,85,0.3)'}`
    : '1px solid var(--border)'
  return (
    <button
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
  const [toDelete, setToDelete] = useState<FavoriteRow | null>(null)
  const [shareTarget, setShareTarget] = useState<FavoriteRow | null>(null)
  const [noteTarget, setNoteTarget] = useState<FavoriteRow | null>(null)
  // notes: osm_id → texte (state local rafraîchi depuis localStorage)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const isMobile = useIsMobile()

  const searchParams = useSearchParams()
  const activeListId = searchParams.get('list')

  const { lists, fetchLists, createList, updateList, deleteList, removeItemFromList } = useLists()
  const [showCreateList, setShowCreateList] = useState(false)
  const [editingList, setEditingList] = useState<HookListRow | null>(null)
  const [listItems, setListItems] = useState<ListItemEntry[]>([])
  const [listItemsLoading, setListItemsLoading] = useState(false)
  const [deleteListTarget, setDeleteListTarget] = useState<HookListRow | null>(null)

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
    }
  }, [isReady, loadFavorites, fetchLists])

  useEffect(() => {
    if (!isReady || !activeListId) {
      setListItems([])
      return
    }
    setListItemsLoading(true)
    getAuthHeaders().then((headers) =>
      fetch(`/api/lists/${activeListId}/items`, { headers })
        .then((r) => r.json())
        .then((json) => setListItems(json.data ?? []))
        .catch(() => setListItems([]))
        .finally(() => setListItemsLoading(false))
    )
  }, [isReady, activeListId])

  const sorted = useMemo((): FavoriteRow[] => {
    let arr: FavoriteRow[] = [...favorites]
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
  }, [favorites, sortBy])

  const osmIdToListNames = useMemo((): Map<string, string[]> => {
    // Intentionally empty: loading all list memberships for every fav would require
    // N API calls. Badges show only when viewing a specific list (?list=id).
    return new Map<string, string[]>()
  }, [])

  if (!isReady)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--white)',
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
      <PageHeader current="Enregistrés" />

      <main style={{ flex: 1 }}>
        <div
          style={{
            maxWidth: 660,
            margin: '0 auto',
            padding: isMobile ? '24px 16px 100px' : '36px 20px 80px',
          }}
        >
          {/* Header */}
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
              Enregistré
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-60)' }}>
              {loading
                ? 'Chargement…'
                : `${favorites.length} restaurant${favorites.length !== 1 ? 's' : ''} · ${lists.length} liste${lists.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Controls */}
          {!loading && !activeListId && (
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
                        background: viewMode === m ? 'var(--ink)' : 'transparent',
                        color: viewMode === m ? 'white' : 'var(--text-2)',
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

          {/* Lists grid */}
          {!activeListId && lists.length > 0 && (
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
              <NewListCard onClick={() => setShowCreateList(true)} />
            </div>
          )}

          {/* List detail view */}
          {activeListId && activeList && (
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
                <div>
                  <h2
                    style={{
                      margin: '0 0 4px',
                      fontFamily: 'var(--font-display)',
                      fontSize: 26,
                      fontWeight: 400,
                      letterSpacing: '-0.04em',
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
                      }}
                    >
                      {activeList.description}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>
                    {activeList.item_count} lieu{activeList.item_count !== 1 ? 'x' : ''} ·{' '}
                    {activeList.is_public ? 'Publique' : 'Privée'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
                      border: '1px solid rgba(217,79,61,0.3)',
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
                    textAlign: 'center',
                    padding: '40px 0',
                    color: 'var(--text-3)',
                    fontSize: 13,
                  }}
                >
                  Cette liste est vide.
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
          )}

          {/* Skeleton */}
          {loading && (
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
                  border: '1px solid rgba(217,79,61,0.3)',
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
          {!loading && !favorites.length && (
            <div
              className="anim-fade-up"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 24px',
                textAlign: 'center',
              }}
            >
              {/* SVG map pin with heart */}
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
                  d="M33 30.5c0-1.657 1.343-3 3-3s3 1.343 3 3c0 .88-.38 1.67-.984 2.22L36 35l-2.016-2.28A2.99 2.99 0 0 1 33 30.5z"
                  fill="white"
                />
              </svg>
              <h2
                style={{
                  margin: '0 0 8px',
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  fontWeight: 400,
                  letterSpacing: '-0.03em',
                }}
              >
                Aucun lieu enregistré
              </h2>
              <p
                style={{
                  margin: '0 0 28px',
                  color: 'var(--text-3)',
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                Appuyez sur ♡ sur n&apos;importe quel restaurant
                <br />
                pour le sauvegarder ici.
              </p>
              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '11px 24px',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--accent)',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: 'var(--s-forest)',
                }}
              >
                Explorer la carte →
              </Link>
            </div>
          )}

          {/* Liste */}
          {viewMode === 'list' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sorted.map((fav, i) => (
                <FavCardList
                  key={fav.id}
                  fav={fav}
                  index={i}
                  note={notes[fav.osm_id] ?? ''}
                  listNames={osmIdToListNames.get(fav.osm_id) ?? []}
                  onRemove={() => setToDelete(fav)}
                  onOpenMap={() =>
                    router.push(
                      `/?select=${encodeURIComponent(fav.osm_id)}&lat=${fav.lat}&lon=${fav.lon}`
                    )
                  }
                  onShare={() => setShareTarget(fav)}
                  onNote={() => setNoteTarget(fav)}
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
                  onOpenMap={() =>
                    router.push(
                      `/?select=${encodeURIComponent(fav.osm_id)}&lat=${fav.lat}&lon=${fav.lon}`
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {toDelete && (
        <DeleteModal
          name={toDelete.name}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setToDelete(null)}
        />
      )}
      {shareTarget && <ShareDrawer fav={shareTarget} onClose={() => setShareTarget(null)} />}
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
          onSave={async (name, desc, pub) => {
            await updateList(editingList.id, { name, description: desc, is_public: pub })
            setEditingList(null)
          }}
          onClose={() => setEditingList(null)}
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

      <GlobalFooter />
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
