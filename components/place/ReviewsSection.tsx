'use client'
// ReviewsSection — community reviews block on the place detail (native-only UI).
// Shows the aggregate rating, the list of reviews, and a CTA to write/edit one.
import { useState } from 'react'
import Image from 'next/image'
import { Star } from 'lucide-react'
import type { UserReview } from '@/types'
import type { UseReviews } from '@/lib/hooks/useReviews'
import { useIsNative } from '@/lib/native/platform'
import { Avatar } from '@/components/social/Avatar'
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
          <b style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 700 }}>
            {r.author.display_name}
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
  const { reviews, summary, myReview, submit, remove } = api

  // App-only feature — never render on web (keeps web output frozen).
  if (!native) return null
  // Nothing to show and nothing to do → don't render an empty shell.
  if (reviews.length === 0 && !isSignedIn) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header + aggregate */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
            margin: 0,
          }}
        >
          Avis de la communauté
        </h3>
        {summary.count > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Stars rating={Math.round(summary.average)} size={14} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {summary.average.toFixed(1)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>({summary.count})</span>
          </div>
        )}
      </div>

      {/* CTA */}
      {isSignedIn ? (
        <button
          onClick={() => setComposerOpen(true)}
          style={{
            alignSelf: 'flex-start',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            borderRadius: 'var(--r-lg)',
            padding: '9px 15px',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <Star size={15} strokeWidth={1.8} color="var(--accent)" fill="var(--accent)" />
          {myReview ? 'Modifier mon avis' : reviews.length === 0 ? 'Sois le premier à donner ton avis' : 'Donner mon avis'}
        </button>
      ) : (
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>
          Connecte-toi pour laisser un avis.
        </p>
      )}

      {/* List */}
      {reviews.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reviews.map((r) => (
            <ReviewItem key={r.id} r={r} />
          ))}
        </div>
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
