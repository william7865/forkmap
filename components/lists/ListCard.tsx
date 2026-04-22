'use client'

import React from 'react'
import type { ListRow } from '@/lib/hooks/useLists'

function listHue(name: string): number {
  return name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
}

export function ListCard({ list, onClick }: { list: ListRow; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false)
  const hue = listHue(list.name)
  const gradient = `linear-gradient(135deg, hsl(${hue},40%,25%), hsl(${hue},55%,45%))`

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        textAlign: 'left',
        border: `1px solid ${hovered ? 'var(--ink-20)' : 'var(--border)'}`,
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'var(--white)',
        boxShadow: hovered ? 'var(--s3)' : 'var(--s1)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 180ms var(--ease-out)',
        fontFamily: 'var(--font-body)',
        padding: 0,
      }}
      aria-label={`Ouvrir la liste ${list.name}`}
    >
      <div style={{ height: 60, background: gradient, flexShrink: 0 }} />
      <div style={{ padding: '10px 12px' }}>
        <p
          style={{
            margin: '0 0 3px',
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {list.name}
        </p>
        <p style={{ margin: 0, fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>
          {list.item_count} lieu{list.item_count !== 1 ? 'x' : ''}&nbsp;
          {list.is_public ? '🌍' : '🔒'}
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
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: 100,
        border: `1.5px dashed ${hovered ? 'var(--accent)' : 'var(--bone)'}`,
        borderRadius: 'var(--r-xl)',
        cursor: 'pointer',
        background: hovered ? 'var(--accent-light)' : 'var(--surface)',
        transition: 'all 160ms',
        fontFamily: 'var(--font-body)',
        padding: 0,
        gap: 6,
      }}
      aria-label="Créer une nouvelle liste"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>Nouvelle liste</span>
    </button>
  )
}
