'use client'

import React from 'react'
import type { ListRow } from '@/lib/hooks/useLists'

const GRADIENTS: [string, string][] = [
  ['#1c3a28', '#4a8c5c'], // forest green
  ['#3a1c1c', '#8c4a4a'], // terracotta red
  ['#1c2a3a', '#4a5c8c'], // navy blue
  ['#3a2d1c', '#8c6c3a'], // warm amber
  ['#2d1c3a', '#6c4a8c'], // purple
  ['#1c3a3a', '#3a8c8c'], // teal
]

function gradientForId(id: string): [string, string] {
  const idx = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % GRADIENTS.length
  return GRADIENTS[idx]
}

export function ListCard({ list, onClick }: { list: ListRow; onClick: () => void }) {
  const [from, to] = gradientForId(list.id)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ouvrir la liste ${list.name}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '0.85',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        fontFamily: 'var(--font-body)',
        flexShrink: 0,
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
            color: 'white',
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

export function NewListCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false)
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
        borderRadius: 16,
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
          background: hovered ? 'rgba(45,122,85,0.15)' : 'var(--bone)',
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
