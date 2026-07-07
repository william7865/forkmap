'use client'
// ReviewsSection — community reviews block on the place detail (native-only UI).
// Shows the aggregate rating, the list of reviews, and a CTA to write/edit one.
import { useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { Star } from 'lucide-react'
import type { UserReview } from '@/types'
import type { UseReviews } from '@/lib/hooks/useReviews'
import { useIsNative } from '@/lib/native/platform'
import { Avatar } from '@/components/social/Avatar'
import VerifiedBadge from '@/components/social/VerifiedBadge'
import ReviewComposer from '@/components/place/ReviewComposer'

/** "aujourd'hui" · "il y a 3 j" · "il y a 2 sem" · "12 mars 2026" */
function relDate(iso: string): string {
  const then = new Date(iso).getTime()
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const EYEBROW: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
}

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 1.5 }} aria-label={`${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.5}
          color="var(--accent)"
          fill={rating >= n ? 'var(--accent)' : 'transparent'}
        />
      ))}
    </div>
  )
}

function ReviewItem({ r }: { r: UserReview }) {
  return (
    <div style={{ display: 'flex', gap: 11 }}>
      <div style={{ flexShrink: 0 }}>
        <Avatar name={r.author.display_name} src={r.author.avatar_url} id={r.user_id} size={34} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <b
            style={{
              fontSize: 13.5,
              color: 'var(--text)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {r.author.display_name}
            <VerifiedBadge verified={r.author.verified} size={13} />
          </b>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{relDate(r.created_at)}</span>
        </div>
        <div style={{ marginTop: 3 }}>
          <Stars rating={r.rating} />
        </div>
        {r.text && (
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.45, margin: '6px 0 0' }}>
            {r.text}
          </p>
        )}
        {r.photo_urls.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {r.photo_urls.map((u, i) => (
              <div
                key={i}
                style={{ position: 'relative', width: 68, height: 68, borderRadius: 10, overflow: 'hidden' }}
              >
                <Image src={u} alt="" fill sizes="68px" style={{ objectFit: 'cover' }} unoptimized />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Two greyed placeholder rows shown while the first fetch is in flight. */
function ReviewsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} style={{ display: 'flex', gap: 11, opacity: 0.5 }}>
          <div
            style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 3 }}>
            <div style={{ width: '38%', height: 9, borderRadius: 4, background: 'var(--border)' }} />
            <div style={{ width: '72%', height: 9, borderRadius: 4, background: 'var(--border)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ReviewsSection({
  api,
  isSignedIn,
  placeName,
}: {
  api: UseReviews
  isSignedIn: boolean
  placeName: string
}) {
  const native = useIsNative()
  const [composerOpen, setComposerOpen] = useState(false)
  const { reviews, summary, loading, myReview, submit, remove } = api

  // App-only feature — never render on web (keeps web output frozen).
  if (!native) return null
  // Nothing to show and nothing to do → don't render an empty shell.
  if (reviews.length === 0 && !isSignedIn && !loading) return null

  const ctaLabel = myReview
    ? 'Modifier mon avis'
    : reviews.length === 0
      ? 'Donne le premier avis'
      : 'Donner mon avis'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header: eyebrow + prominent average (the section's one loud element) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ ...EYEBROW, marginBottom: summary.count > 0 ? 4 : 0 }}>
            Avis de la communauté
          </div>
          {summary.count > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: 'var(--text)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                {summary.average.toFixed(1)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                / 5 · {summary.count} avis
              </span>
            </div>
          )}
        </div>
        {summary.count > 0 && <Stars rating={Math.round(summary.average)} size={15} />}
      </div>

      {/* CTA — matches the fiche's secondary-action buttons */}
      {isSignedIn ? (
        <button
          onClick={() => setComposerOpen(true)}
          style={{
            alignSelf: 'flex-start',
            height: 36,
            padding: '0 14px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            borderRadius: 'var(--r-sm)',
            fontSize: 12.5,
            fontWeight: 700,
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <Star size={14} strokeWidth={1.8} color="var(--accent)" fill="var(--accent)" />
          {ctaLabel}
        </button>
      ) : (
        reviews.length > 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>
            Connecte-toi pour laisser un avis.
          </p>
        )
      )}

      {/* List / skeleton */}
      {loading && reviews.length === 0 ? (
        <ReviewsSkeleton />
      ) : (
        reviews.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reviews.map((r) => (
              <ReviewItem key={r.id} r={r} />
            ))}
          </div>
        )
      )}

      {composerOpen && (
        <ReviewComposer
          initial={myReview}
          placeName={placeName}
          onClose={() => setComposerOpen(false)}
          onSubmit={submit}
          onDelete={myReview ? remove : undefined}
        />
      )}
    </div>
  )
}
