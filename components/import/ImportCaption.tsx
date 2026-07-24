'use client'
// ImportCaption — the creator's caption, made readable. The raw social caption is
// one blob (collapsed line breaks + a wall of trailing hashtags + emoji). We keep
// the creator's words verbatim (never paraphrased) but split the prose from the
// tags: prose in a quote with its line breaks preserved and a "voir plus" toggle
// when it's long, hashtags as quiet chips underneath. See lib/import/caption.ts.
import { useState, useRef, useLayoutEffect } from 'react'
import { formatCaption } from '@/lib/import/caption'
import { useLanguage } from '@/lib/i18n/useLanguage'

const COLLAPSED_LINES = 6
const MAX_CHIPS = 12

export default function ImportCaption({ raw }: { raw: string | null | undefined }) {
  const { tr } = useLanguage()
  const { body, hashtags } = formatCaption(raw)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const quoteRef = useRef<HTMLQuoteElement>(null)

  // Only offer "voir plus" when the clamped quote actually overflows — measured,
  // not guessed from length. Runs while collapsed, so the clamp is in effect.
  useLayoutEffect(() => {
    const el = quoteRef.current
    if (!el || expanded) return
    setOverflowing(el.scrollHeight - el.clientHeight > 4)
  }, [body, expanded])

  if (!body && hashtags.length === 0) return null

  const visibleTags = hashtags.slice(0, MAX_CHIPS)
  const extra = hashtags.length - visibleTags.length

  return (
    <div style={{ marginTop: 16 }}>
      {body && (
        <>
          <blockquote
            ref={quoteRef}
            style={{
              margin: 0,
              paddingLeft: 12,
              borderLeft: '2px solid var(--border)',
              fontSize: 14,
              fontStyle: 'italic',
              lineHeight: 1.6,
              color: 'var(--text-2)',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              ...(expanded
                ? {}
                : {
                    display: '-webkit-box',
                    WebkitLineClamp: COLLAPSED_LINES,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }),
            }}
          >
            {body}
          </blockquote>
          {(overflowing || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{
                marginTop: 8,
                padding: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-3)',
              }}
            >
              {expanded ? tr('importSeeLess') : tr('importSeeMore')}
            </button>
          )}
        </>
      )}

      {hashtags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: body ? 12 : 0,
          }}
        >
          {visibleTags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 24,
                padding: '0 9px',
                borderRadius: 999,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-3)',
                fontSize: 11.5,
                fontWeight: 600,
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              #{tag}
            </span>
          ))}
          {extra > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 24,
                padding: '0 9px',
                borderRadius: 999,
                color: 'var(--text-3)',
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              +{extra}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
