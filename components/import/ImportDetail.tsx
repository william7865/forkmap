'use client'
// ============================================================
// ImportDetail — the screen a shared post becomes.
//
// Editorial saved-post layout (cover hero → creator → quoted caption → what we
// found → map → note → related). The skin is Forkmap's own Monochrome Premium:
// white page, near-black accent, gold star, Playfair display titles. Rather than
// paraphrasing the caption with an LLM, we quote the creator verbatim and put
// FACTS underneath — the real restaurant, its rating, its hours, its distance.
//
// Rendered by two routes (see components/import/ImportsRow.tsx → importHref):
//   /import/[id]  — the web
//   /import?id=…  — the native app (a static export can't serve an unknown path)
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ChevronLeft, Play, Music2, ArrowUpRight, Loader2, Search, Navigation } from 'lucide-react'
import type { ImportCandidatePlace, ImportPlatform, ImportRow, PlaceCard as TPlace } from '@/types'
import { useAuthGuard } from '@/lib/hooks/useAuthGuard'
import { useImportsStore } from '@/lib/hooks/useImportsContext'
import { useLanguage } from '@/lib/i18n/useLanguage'
import { useIsNative } from '@/lib/native/platform'
import { candidateToPlaceCard, toPlaceCard } from '@/lib/import/resolve'
import { searchPlacesOnce, type PlaceSearchResult } from '@/lib/hooks/usePlaceSearch'
import { placeGradient } from '@/lib/gradients'
import { apiFetch } from '@/lib/api'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { setPendingSelect } from '@/lib/pendingSelect'
import { useToast, type ToastType } from '@/lib/hooks/useToast'
import ToastStack from '@/components/ui/ToastStack'
import PlaceCard from '@/components/place/PlaceCard'
import PlaceSocialProof from '@/components/place/PlaceSocialProof'
import { ImportTile } from '@/components/import/ImportsRow'

// Leaflet reads `window` at import time — never let it near the server bundle.
const ImportMiniMap = dynamic(() => import('@/components/import/ImportMiniMap'), { ssr: false })

/** Platform names are proper nouns, not UI copy — they are not translated. */
const PLATFORM_LABEL: Record<ImportPlatform, string | null> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  other: null,
}

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const {
      data: { session },
    } = await getSupabaseBrowserClient().auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  } catch {
    return {}
  }
}

const EYEBROW = {
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-3)',
  margin: '0 0 10px',
}

export default function ImportDetail() {
  const { isReady } = useAuthGuard()
  const router = useRouter()
  const params = useParams<{ id?: string }>()
  const search = useSearchParams()
  const { tr } = useLanguage()
  const native = useIsNative()
  const { imports, loading, patch } = useImportsStore()
  const { toasts, show, dismiss } = useToast()

  // `/import/[id]` gives a route param; `/import?id=` (native) a query param.
  const id = (typeof params?.id === 'string' ? params.id : null) ?? search.get('id') ?? ''
  const imp = useMemo(() => imports.find((i) => i.id === id) ?? null, [imports, id])

  const pending = !isReady || (loading && !imp)

  return (
    <>
      {pending ? (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <BackBar onBack={() => router.back()} label={tr('importBack')} />
          <HeroSkeleton />
        </div>
      ) : !imp ? (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <BackBar onBack={() => router.back()} label={tr('importBack')} />
          <p style={{ padding: 24, fontSize: 14, color: 'var(--text-2)' }}>{tr('importMissing')}</p>
        </div>
      ) : (
        <Loaded
          imp={imp}
          patch={patch}
          imports={imports}
          native={native}
          onToast={(msg, kind) => show(msg, kind ?? 'info')}
        />
      )}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </>
  )
}

// ── Chrome ────────────────────────────────────────────────

function BackBar({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: 'calc(var(--safe-top) + 8px) 12px 8px',
        background: 'var(--bg)',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 36,
          padding: '0 12px 0 6px',
          borderRadius: 999,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <ChevronLeft size={17} />
        {label}
      </button>
    </div>
  )
}

function HeroSkeleton() {
  return (
    <div style={{ padding: 16 }}>
      <div
        className="skeleton"
        style={{
          width: '100%',
          aspectRatio: '4 / 5',
          borderRadius: 20,
          background: 'var(--surface-2)',
        }}
      />
      <div
        className="skeleton"
        style={{
          height: 26,
          width: '62%',
          borderRadius: 8,
          background: 'var(--surface-2)',
          marginTop: 18,
        }}
      />
      <div
        className="skeleton"
        style={{
          height: 14,
          width: '40%',
          borderRadius: 8,
          background: 'var(--surface-2)',
          marginTop: 10,
        }}
      />
    </div>
  )
}

// ── The screen, once the row is known ─────────────────────

interface LoadedProps {
  imp: ImportRow
  imports: ImportRow[]
  native: boolean
  patch: (id: string, p: Partial<ImportRow>) => Promise<void>
  onToast: (msg: string, kind?: ToastType) => void
}

function Loaded({ imp, imports, native, patch, onToast }: LoadedProps) {
  const { tr } = useLanguage()
  const router = useRouter()
  const [thumbBroken, setThumbBroken] = useState(false)

  const place = imp.place_snapshot
  const openPost = useCallback(() => {
    window.open(imp.url, '_blank', 'noopener,noreferrer')
  }, [imp.url])

  const title = place?.name ?? imp.post_title ?? tr('importPending')
  const platform = PLATFORM_LABEL[imp.platform] ?? tr('importOpenSource')
  const cover = imp.post_thumb && !thumbBroken ? imp.post_thumb : null

  // Other posts that landed on the same restaurant.
  const alsoSeenIn = imports.filter(
    (i) => i.id !== imp.id && i.osm_id != null && i.osm_id === imp.osm_id
  )

  /** The user settled the venue (picked a candidate, or searched by hand).
   *  Invariant 1 of lib/import/resolve.ts: `resolved` ⇒ osm_id AND snapshot. */
  const resolveTo = useCallback(
    async (card: TPlace | null) => {
      if (!card) {
        onToast(tr('error'), 'error')
        return
      }
      try {
        await patch(imp.id, {
          status: 'resolved',
          osm_id: card.osm_id,
          place_snapshot: card,
          candidates: null,
          resolved_at: new Date().toISOString(),
        })
      } catch (err) {
        onToast(err instanceof Error ? err.message : tr('error'), 'error')
      }
    },
    [imp.id, patch, onToast, tr]
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
        paddingBottom: native ? 'calc(var(--safe-bottom) + 88px)' : 40,
      }}
    >
      <BackBar onBack={() => router.back()} label={tr('importBack')} />

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px' }}>
        {/* 1 — Hero: the Reel's cover. Tapping it opens the post where it lives. */}
        <button
          type="button"
          onClick={openPost}
          aria-label={tr('importPlay')}
          style={{
            position: 'relative',
            display: 'block',
            width: '100%',
            aspectRatio: '4 / 5',
            padding: 0,
            border: '1px solid var(--border)',
            borderRadius: 20,
            overflow: 'hidden',
            cursor: 'pointer',
            background: placeGradient(imp.id),
            boxShadow: 'var(--s3)',
            animation: 'fadeUp 280ms var(--ease-out) both',
          }}
        >
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              onError={() => setThumbBroken(true)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(transparent 45%, rgba(0,0,0,0.68))',
            }}
          />
          {/* Play affordance */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 62,
              height: 62,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.94)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 22px rgba(0,0,0,0.28)',
            }}
          >
            <Play size={24} fill="var(--accent)" color="var(--accent)" style={{ marginLeft: 3 }} />
          </span>
          {/* The creator, credited in their own currency: the handle. */}
          {imp.post_author && (
            <span
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                maxWidth: 'calc(100% - 24px)',
                padding: '5px 11px 5px 8px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <Music2 size={12} />
              {imp.post_author}
            </span>
          )}
        </button>

        {/* 2 — Title */}
        <h1
          style={{
            margin: '18px 0 0',
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            color: 'var(--text)',
            animation: 'fadeUp 300ms var(--ease-out) 60ms both',
          }}
        >
          {title}
        </h1>

        {/* 3 — Source chip */}
        <button
          type="button"
          onClick={openPost}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 10,
            padding: '5px 11px',
            borderRadius: 999,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text-2)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {platform}
          <ArrowUpRight size={13} />
        </button>

        {/* 4 — The creator's caption, quoted verbatim. Never paraphrased: their
            words are the reason this post was saved. */}
        {imp.post_caption && (
          <blockquote
            style={{
              margin: '16px 0 0',
              paddingLeft: 12,
              borderLeft: '2px solid var(--border)',
              fontSize: 14,
              fontStyle: 'italic',
              lineHeight: 1.6,
              color: 'var(--text-2)',
            }}
          >
            «&nbsp;{imp.post_caption}&nbsp;»
          </blockquote>
        )}

        {/* 5 — What we found */}
        <section style={{ marginTop: 28, animation: 'fadeUp 300ms var(--ease-out) 120ms both' }}>
          <h2 style={EYEBROW}>{tr('importFoundTitle')}</h2>

          {imp.status === 'pending' && <PendingBlock />}

          {imp.status === 'resolved' && place && <ResolvedBlock place={place} onToast={onToast} />}

          {imp.status === 'ambiguous' && (
            <AmbiguousBlock
              candidates={imp.candidates ?? []}
              onPick={(c) => resolveTo(candidateToPlaceCard(c))}
            />
          )}

          {imp.status === 'failed' && <FailedBlock onPick={(r) => resolveTo(toPlaceCard(r))} />}
        </section>

        {/* 6 — Where it is */}
        {place && (
          <section style={{ marginTop: 26, animation: 'fadeUp 300ms var(--ease-out) 180ms both' }}>
            <h2 style={EYEBROW}>{tr('importWhereTitle')}</h2>
            <ImportMiniMap lat={place.lat} lon={place.lon} />
          </section>
        )}

        {/* 7 — My note */}
        <section style={{ marginTop: 26, animation: 'fadeUp 300ms var(--ease-out) 240ms both' }}>
          <h2 style={EYEBROW}>{tr('importNoteTitle')}</h2>
          <NoteField
            initial={imp.note ?? ''}
            onSave={async (note) => {
              try {
                await patch(imp.id, { note: note.length > 0 ? note : null })
              } catch (err) {
                onToast(err instanceof Error ? err.message : tr('error'), 'error')
              }
            }}
          />
        </section>

        {/* 8 — Also seen in */}
        {alsoSeenIn.length > 0 && (
          <section style={{ marginTop: 26, animation: 'fadeUp 300ms var(--ease-out) 300ms both' }}>
            <h2 style={EYEBROW}>{tr('importAlsoSeenIn')}</h2>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {alsoSeenIn.map((other) => (
                <ImportTile key={other.id} imp={other} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ── status: pending ───────────────────────────────────────

function PendingBlock() {
  const { tr } = useLanguage()
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 16,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div
        className="skeleton"
        style={{
          width: 62,
          height: 62,
          borderRadius: 14,
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="skeleton"
          style={{ height: 13, width: '55%', borderRadius: 6, background: 'var(--surface-2)' }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            fontSize: 12.5,
            color: 'var(--text-3)',
          }}
        >
          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
          {tr('importPending')}
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.4 }}>
          {tr('importPendingHint')}
        </p>
      </div>
    </div>
  )
}

// ── status: resolved ──────────────────────────────────────

function ResolvedBlock({
  place,
  onToast,
}: {
  place: TPlace
  onToast: (msg: string, kind?: ToastType) => void
}) {
  const { tr } = useLanguage()
  const router = useRouter()
  const [saved, setSaved] = useState<boolean>(!!place.is_favorite)
  const [busy, setBusy] = useState(false)

  // Is it already in the user's favorites? The snapshot was written by the
  // resolver and knows nothing about it.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const headers = await authHeaders()
      if (!headers.Authorization) return
      const res = await apiFetch('/api/favorites', { headers })
      if (!res.ok || cancelled) return
      const { data } = (await res.json()) as { data?: { osm_id: string }[] }
      if (cancelled || !data) return
      setSaved(data.some((f) => f.osm_id === place.osm_id))
    })()
    return () => {
      cancelled = true
    }
  }, [place.osm_id])

  const toggleSave = useCallback(async () => {
    if (busy) return
    setBusy(true)
    const next = !saved
    setSaved(next) // optimistic
    try {
      const headers = await authHeaders()
      const res = next
        ? await apiFetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ place }),
          })
        : await apiFetch(`/api/favorites/${encodeURIComponent(place.osm_id)}`, {
            method: 'DELETE',
            headers,
          })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onToast(next ? tr('importSavedAction') : tr('removed'), 'success')
    } catch {
      setSaved(!next) // rollback
      onToast(tr('error'), 'error')
    } finally {
      setBusy(false)
    }
  }, [busy, saved, place, onToast, tr])

  const openOnMap = useCallback(() => {
    setPendingSelect(place)
    router.push(`/?select=${encodeURIComponent(place.osm_id)}`)
  }, [place, router])

  const route = useCallback(() => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`,
      '_blank',
      'noopener,noreferrer'
    )
  }, [place.lat, place.lon])

  const reviews = place.fsq?.total_ratings
  const michelin = place.wikidata?.michelin_stars ?? place.osm_enriched?.michelin ?? 0
  const friends = place.friendsSaved?.length ?? 0

  return (
    <div>
      {/* The real Forkmap place card — same component as the map list, so an
          imported restaurant is presented exactly like any other. */}
      <PlaceCard
        place={{ ...place, is_favorite: saved }}
        isSelected={false}
        isHovered={false}
        index={0}
        onHover={() => {}}
        onLeave={() => {}}
        onClick={openOnMap}
        onToggleFavorite={() => void toggleSave()}
      />

      {/* Only the facts the card does NOT already carry. The card prints the name,
          the star, the cuisine, the price and the open state — repeating them here
          would read as a bug. What it never shows: how many people voted for that
          star, and the Michelin distinction (a badge it reserves for the app). */}
      {(reviews != null || michelin > 0) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 10,
            fontSize: 12.5,
            color: 'var(--text-2)',
          }}
        >
          {reviews != null && (
            <span>
              {reviews.toLocaleString('fr-FR')} {tr('importReviews')}
            </span>
          )}
          {michelin > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--star)" aria-hidden>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {michelin > 1 ? `${michelin} ${tr('importMichelinStars')}` : tr('importMichelin')}
            </span>
          )}
        </div>
      )}

      {/* "N amis l'ont enregistré" — from the snapshot… */}
      {friends > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--text-2)' }}>
          {friends} {friends === 1 ? tr('importFriendSavedOne') : tr('importFriendsSavedMany')}
        </p>
      )}
      {/* …and live, from the friends graph (app-only, renders nothing on web). */}
      <PlaceSocialProof osmId={place.osm_id} />

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={() => void toggleSave()}
          disabled={busy}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            height: 46,
            borderRadius: 14,
            border: saved ? '1px solid var(--border)' : 'none',
            background: saved ? 'var(--surface)' : 'var(--accent)',
            color: saved ? 'var(--text)' : 'var(--on-accent, #fff)',
            cursor: busy ? 'default' : 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 700,
            boxShadow: saved ? 'none' : 'var(--s2)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 21s-7-5.7-7-11a5 5 0 019-3 5 5 0 019 3c0 5.3-7 11-7 11z" />
          </svg>
          {saved ? tr('importSavedAction') : tr('importSaveAction')}
        </button>
        <button
          type="button"
          onClick={route}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            height: 46,
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <Navigation size={15} />
          {tr('importRoute')}
        </button>
      </div>
    </div>
  )
}

// ── status: ambiguous ─────────────────────────────────────

function AmbiguousBlock({
  candidates,
  onPick,
}: {
  candidates: ImportCandidatePlace[]
  onPick: (c: ImportCandidatePlace) => void
}) {
  const { tr } = useLanguage()
  const [picking, setPicking] = useState<string | null>(null)

  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
        {tr('importWhichOne')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {candidates.map((c) => {
          const key = `${c.name}|${c.lat},${c.lon}`
          const busy = picking === key
          return (
            <button
              key={key}
              type="button"
              disabled={picking != null}
              onClick={() => {
                setPicking(key)
                onPick(c)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 16,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                cursor: picking ? 'default' : 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-body)',
                opacity: picking && !busy ? 0.55 : 1,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '2px solid var(--border-strong, var(--border))',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: busy ? 'var(--accent)' : 'transparent',
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-display)',
                    fontSize: 15.5,
                    fontWeight: 600,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.name}
                </span>
                {c.context && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: 2,
                      fontSize: 12,
                      color: 'var(--text-3)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.context}
                  </span>
                )}
              </span>
              {c.rating != null && <Rating value={c.rating} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Rating({ value }: { value: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        flexShrink: 0,
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--text)',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--star)" aria-hidden>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {value.toFixed(1)}
    </span>
  )
}

// ── status: failed ────────────────────────────────────────

function FailedBlock({ onPick }: { onPick: (r: PlaceSearchResult) => void }) {
  const { tr } = useLanguage()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PlaceSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [ran, setRan] = useState(false)

  const run = useCallback(async () => {
    const query = q.trim()
    if (query.length < 3 || searching) return
    setSearching(true)
    try {
      // Same one-shot search the resolver uses (Google first, OSM fallback).
      const found = await searchPlacesOnce(query, null)
      setResults(found)
    } catch {
      setResults([])
    } finally {
      setRan(true)
      setSearching(false)
    }
  }, [q, searching])

  return (
    <div>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
        {tr('importNotFoundHint')}
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void run()}
          placeholder={tr('importSearchPlaceholder')}
          aria-label={tr('importSearchManually')}
          style={{
            flex: 1,
            minWidth: 0,
            height: 44,
            padding: '0 13px',
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={q.trim().length < 3 || searching}
          aria-label={tr('importSearchManually')}
          style={{
            width: 46,
            height: 44,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
            border: 'none',
            background: q.trim().length < 3 ? 'var(--surface-2)' : 'var(--accent)',
            color: q.trim().length < 3 ? 'var(--text-3)' : 'var(--on-accent, #fff)',
            cursor: q.trim().length < 3 ? 'default' : 'pointer',
            flexShrink: 0,
          }}
        >
          {searching ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Search size={16} />
          )}
        </button>
      </div>

      {ran && !searching && results.length === 0 && (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
          {tr('importNoSearchResult')}
        </p>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                borderRadius: 14,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-body)',
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.name}
                </span>
                {r.context && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: 2,
                      fontSize: 12,
                      color: 'var(--text-3)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.context}
                  </span>
                )}
              </span>
              {r.rating != null && <Rating value={r.rating} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── The personal note ─────────────────────────────────────

function NoteField({
  initial,
  onSave,
}: {
  initial: string
  onSave: (note: string) => Promise<void>
}) {
  const { tr } = useLanguage()
  const [value, setValue] = useState(initial)
  const MAX = 500

  return (
    <textarea
      value={value}
      rows={3}
      maxLength={MAX}
      placeholder={tr('importAddNote')}
      aria-label={tr('importNoteTitle')}
      onChange={(e) => setValue(e.target.value.slice(0, MAX))}
      // Saved on blur: no save button, no dirty state to lose.
      onBlur={() => {
        const next = value.trim()
        if (next === initial.trim()) return
        void onSave(next)
      }}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '12px 13px',
        borderRadius: 16,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        lineHeight: 1.6,
        resize: 'none',
        outline: 'none',
      }}
    />
  )
}
