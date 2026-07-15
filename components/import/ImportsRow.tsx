'use client'
// ImportsRow — the "seen on social" strip at the top of Favoris. An editorial
// saved-recently row (video thumbnails, source badge, status) in Forkmap's own
// skin (light monochrome, gold star).
import { useState } from 'react'
import Link from 'next/link'
import { Play, Loader2, AlertCircle } from 'lucide-react'
import type { ImportRow } from '@/types'
import { useLanguage } from '@/lib/i18n/useLanguage'
import { decodeEntities } from '@/lib/import/parse'
import { placeGradient } from '@/lib/gradients'
import { useIsNative } from '@/lib/native/platform'

/**
 * Where a tile points.
 *
 * The native app is a STATIC export (capacitor.config.ts → webDir: 'out'), and a
 * static export can only serve the paths it pre-rendered. `/import/<uuid>` is not
 * one of them — the ids are only known at runtime — so in the app the tile goes to
 * the pre-rendered `/import/` shell and carries the id as a query param instead.
 * The web keeps the clean, linkable path.
 */
export function importHref(id: string, native: boolean): string {
  return native ? `/import?id=${encodeURIComponent(id)}` : `/import/${id}`
}

interface Props {
  imports: ImportRow[]
}

export default function ImportsRow({ imports }: Props) {
  const { tr } = useLanguage()
  if (imports.length === 0) return null

  const needsAttention = imports.filter(
    (i) => i.status === 'ambiguous' || i.status === 'failed'
  ).length

  return (
    <section style={{ marginBottom: 22 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 16px',
          marginBottom: 10,
        }}
      >
        <h2
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
            margin: 0,
          }}
        >
          {tr('importsRowTitle')}
        </h2>
        {needsAttention > 0 && (
          <span
            aria-label={`${needsAttention} ${tr('importNeedsConfirm')}`}
            style={{
              minWidth: 16,
              height: 16,
              padding: '0 5px',
              borderRadius: 999,
              background: 'var(--closed)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              lineHeight: '16px',
              textAlign: 'center',
            }}
          >
            {needsAttention}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          padding: '2px 16px 4px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {imports.map((imp) => (
          <ImportTile key={imp.id} imp={imp} />
        ))}
      </div>
    </section>
  )
}

/** One video thumbnail. Exported: the import detail reuses it for "Vu aussi dans". */
export function ImportTile({ imp }: { imp: ImportRow }) {
  const { tr } = useLanguage()
  const native = useIsNative()
  const [broken, setBroken] = useState(false)
  const title =
    imp.place_snapshot?.name ??
    (imp.post_title ? decodeEntities(imp.post_title) : tr('importPending'))
  const cover = imp.post_thumb && !broken ? imp.post_thumb : null

  const status =
    imp.status === 'pending'
      ? tr('importPending')
      : imp.status === 'ambiguous'
        ? tr('importNeedsConfirm')
        : imp.status === 'failed'
          ? tr('importNotFound')
          : null
  // A fresh share has no title yet, so the title line already reads "Analyse en
  // cours…" — printing the status under it would just say it twice.
  const label = status === title ? null : status

  return (
    <Link
      href={importHref(imp.id, native)}
      style={{ flexShrink: 0, width: 104, textDecoration: 'none' }}
    >
      <div
        style={{
          position: 'relative',
          width: 104,
          height: 148,
          borderRadius: 14,
          overflow: 'hidden',
          background: placeGradient(imp.id),
          boxShadow: 'var(--s2)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Plain <img>, never next/image: a social CDN thumbnail is a foreign host
            (next/image would throw on any host missing from images.remotePatterns),
            and a dead URL falls back to the gradient. */}
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
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
        )}
        {/* Legibility scrim under the badge */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.45))',
          }}
        />
        {imp.status === 'pending' ? (
          <Badge>
            <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
          </Badge>
        ) : imp.status === 'ambiguous' || imp.status === 'failed' ? (
          <Badge tone="alert">
            <AlertCircle size={11} />
          </Badge>
        ) : (
          <Badge>
            <Play size={11} fill="currentColor" />
          </Badge>
        )}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text)',
          lineHeight: 1.25,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {title}
      </div>
      {label && <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>}
    </Link>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: 'alert' }) {
  return (
    <span
      style={{
        position: 'absolute',
        bottom: 6,
        left: 6,
        width: 22,
        height: 22,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tone === 'alert' ? 'var(--closed)' : 'rgba(0,0,0,0.55)',
        color: '#fff',
        backdropFilter: 'blur(6px)',
      }}
    >
      {children}
    </span>
  )
}
