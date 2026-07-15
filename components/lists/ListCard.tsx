'use client'

import React from 'react'
import type { ListRow } from '@/lib/hooks/useLists'
import { listGradient } from '@/lib/gradients'

/**
 * A saved list. Two skins share the same data:
 *  - `card`  → the web grid tile (photo-ish gradient with overlaid title).
 *  - `row`   → the native "Bibliothèque" collection row :
 *              [ cover 56 ] [ name serif + "N lieux · …" ] [ menu ].
 * `variant` defaults to `card` so the web grid is untouched.
 */
export function ListCard({
  list,
  onClick,
  variant = 'card',
  menu,
}: {
  list: ListRow
  onClick: () => void
  variant?: 'card' | 'row'
  menu?: React.ReactNode
}) {
  const [from, to] = listGradient(list.id)

  if (variant === 'row') {
    const shared =
      list.visibility === 'public' ||
      list.is_collaborator ||
      !!list.shared_by ||
      (list.collaborators?.length ?? 0) > 0
    const sub = [
      `${list.item_count} lieu${list.item_count !== 1 ? 'x' : ''}`,
      shared ? 'partagée' : null,
    ]
      .filter(Boolean)
      .join(' · ')

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0' }}>
        <button
          type="button"
          onClick={onClick}
          aria-label={`Ouvrir la liste ${list.name}`}
          className="tap-press"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'var(--font-body)',
          }}
        >
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              flexShrink: 0,
              overflow: 'hidden',
              boxShadow: 'var(--s1)',
              background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 24,
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            {(list.name.trim()[0] ?? '•').toUpperCase()}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 17,
                letterSpacing: '-0.01em',
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {list.name}
            </span>
            <span
              style={{
                display: 'block',
                fontSize: 12.5,
                color: 'var(--text-3)',
                marginTop: 2,
              }}
            >
              {sub}
            </span>
          </span>
        </button>
        {menu && <div style={{ flexShrink: 0 }}>{menu}</div>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ouvrir la liste ${list.name}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '0.85',
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Bottom gradient veil */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '55%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
      {/* Text overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '10px 12px',
        }}
      >
        <p
          style={{
            margin: '0 0 2px',
            fontSize: 13,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {list.name}
        </p>
        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
          {list.item_count} restaurant{list.item_count !== 1 ? 's' : ''}
        </p>
      </div>
    </button>
  )
}

export function NewListCard({
  onClick,
  variant = 'card',
}: {
  onClick: () => void
  variant?: 'card' | 'row'
}) {
  const [hovered, setHovered] = React.useState(false)

  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Créer une nouvelle liste"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 0',
          width: '100%',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-body)',
        }}
      >
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            flexShrink: 0,
            border: '1.5px dashed var(--border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-3)',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)' }}>
          Nouvelle liste
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Créer une nouvelle liste"
      style={{
        width: '100%',
        aspectRatio: '0.85',
        borderRadius: 'var(--r-xl)',
        border: `2px dashed ${hovered ? 'var(--accent)' : 'var(--bone)'}`,
        background: hovered ? 'var(--accent-light)' : 'rgba(255,255,255,0.5)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all 160ms',
        fontFamily: 'var(--font-body)',
        padding: 0,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: hovered ? 'rgba(25,28,29,0.15)' : 'var(--bone)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 160ms',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={hovered ? 'var(--accent)' : 'var(--text-3)'}
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: hovered ? 'var(--accent)' : 'var(--text-3)',
          transition: 'color 160ms',
        }}
      >
        Nouvelle liste
      </span>
    </button>
  )
}
