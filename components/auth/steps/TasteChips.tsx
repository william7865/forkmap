'use client'
import type { TasteOption } from '@/lib/taste-quiz'

/**
 * Presentational grid of toggleable cuisine chips.
 * Shared by the onboarding TasteStep and the settings TasteEditor.
 */
export default function TasteChips({
  options,
  selected,
  onToggle,
}: {
  options: TasteOption[]
  selected: Set<string>
  onToggle: (key: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = selected.has(o.key)
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 14px',
              borderRadius: 999,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1,
              transition: 'background 140ms, border-color 140ms, color 140ms',
              border: on ? '1.5px solid var(--accent)' : '1.5px solid var(--b2)',
              background: on ? 'var(--accent)' : 'var(--white)',
              color: on ? 'var(--white)' : 'var(--ink)',
            }}
          >
            <span style={{ fontSize: 16 }} aria-hidden>
              {o.emoji}
            </span>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
