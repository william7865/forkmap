'use client'

import React, { useState, useEffect } from 'react'
import type { ListRow } from '@/lib/hooks/useLists'
import type { ListVisibility } from '@/types'

const VISIBILITY_OPTIONS: { key: ListVisibility; label: string; hint: string }[] = [
  { key: 'private', label: 'Privée', hint: 'Visible uniquement par toi.' },
  { key: 'friends', label: 'Amis', hint: 'Visible par tes amis seulement.' },
  { key: 'public', label: 'Publique', hint: 'Visible par tout le monde.' },
]

interface Props {
  initial?: ListRow
  onSave: (name: string, description: string | null, visibility: ListVisibility) => Promise<void>
  onClose: () => void
}

export function CreateListModal({ initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [visibility, setVisibility] = useState<ListVisibility>(initial?.visibility ?? 'private')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), description.trim() || null, visibility)
      onClose()
    } finally {
      setSaving(false)
    }
  }

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
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-list-title"
        style={{
          position: 'relative',
          background: 'var(--white)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px calc(28px + var(--safe-bottom))',
          width: '100%',
          maxWidth: 520,
          maxHeight: '90dvh',
          overflowY: 'auto',
          boxShadow: '0 -8px 40px rgba(14,14,13,0.2)',
          animation: 'slideUp 240ms cubic-bezier(0.16,1,0.3,1) backwards',
          fontFamily: 'var(--font-body)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--bone)',
            margin: '0 auto 4px',
          }}
        />
        <h3
          id="create-list-title"
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: '-0.03em',
          }}
        >
          {initial ? 'Modifier la liste' : 'Nouvelle liste'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label
            htmlFor="list-name"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-2)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}
          >
            Nom *
          </label>
          <input
            id="list-name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="Ma liste"
            maxLength={40}
            required
            style={{
              padding: '10px 13px',
              borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 14,
              color: 'var(--text)',
              fontFamily: 'var(--font-body)',
              outline: 'none',
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
          <span style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'right' }}>
            {name.length}/40
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label
            htmlFor="list-desc"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-2)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}
          >
            Description
          </label>
          <textarea
            id="list-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 120))}
            placeholder="Restaurants à essayer pour le brunch…"
            maxLength={120}
            rows={2}
            style={{
              padding: '10px 13px',
              borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 13,
              color: 'var(--text)',
              fontFamily: 'var(--font-body)',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.6,
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
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: 4,
              background: 'var(--surface)',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
            }}
          >
            {VISIBILITY_OPTIONS.map((o) => {
              const active = visibility === o.key
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setVisibility(o.key)}
                  aria-pressed={active}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? 'var(--on-accent)' : 'var(--text-2)',
                    transition: 'background 150ms',
                  }}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
          <p style={{ margin: '6px 2px 0', fontSize: 11.5, color: 'var(--text-3)' }}>
            {VISIBILITY_OPTIONS.find((o) => o.key === visibility)?.hint}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-2)',
              fontFamily: 'inherit',
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--r-md)',
              border: 'none',
              background: name.trim() ? 'var(--accent)' : 'var(--bone)',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 600,
              color: name.trim() ? 'white' : 'var(--text-3)',
              fontFamily: 'inherit',
              boxShadow: name.trim() ? 'var(--s-forest)' : 'none',
              transition: 'all 150ms',
            }}
          >
            {saving ? '…' : initial ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </form>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
