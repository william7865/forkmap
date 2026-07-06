'use client'

import React, { useState, useEffect } from 'react'
import type { ListRow } from '@/lib/hooks/useLists'

interface Props {
  initial?: ListRow
  onSave: (name: string, description: string | null, isPublic: boolean) => Promise<void>
  onClose: () => void
}

export function CreateListModal({ initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? false)
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
      await onSave(name.trim(), description.trim() || null, isPublic)
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
          padding: '20px 20px calc(28px + env(safe-area-inset-bottom))',
          width: '100%',
          maxWidth: 520,
          maxHeight: '90dvh',
          overflowY: 'auto',
          boxShadow: '0 -8px 40px rgba(14,14,13,0.2)',
          animation: 'slideUp 240ms cubic-bezier(0.16,1,0.3,1) both',
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

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
          }}
        >
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {isPublic ? 'Publique' : 'Privée'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)' }}>
              {isPublic ? 'Visible par tes amis' : 'Visible uniquement par toi'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={() => setIsPublic((v) => !v)}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              border: 'none',
              background: isPublic ? 'var(--accent)' : 'var(--bone)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 200ms',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 3,
                left: isPublic ? 23 : 3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: isPublic ? 'var(--on-accent)' : 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 200ms',
              }}
            />
          </button>
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
