'use client'
// ── SurpriseSheet — « Surprends-moi » decision overlay ──────
//   Sits above the map. Optional mood + quick constraints bias
//   a single editorial "coup de cœur" pick. "Une autre" re-rolls
//   without repeating. Pure picking logic lives in lib/surprise.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import type { PlaceCard } from '@/types'
import {
  pickSurprise,
  MOODS,
  type Mood,
  type SurpriseOptions,
  type SurpriseResult,
} from '@/lib/surprise'
import { Sparkles, X, Shuffle, ArrowRight, MapPin } from 'lucide-react'
import HeartButton from '@/components/ui/HeartButton'

interface Props {
  places: PlaceCard[]
  knownCuisines?: string[]
  isMobile?: boolean
  onClose: () => void
  onSelectPlace: (p: PlaceCard) => void
  onToggleFavorite: (p: PlaceCard) => void
}

const PRICES: { tier: 1 | 2 | 3; label: string }[] = [
  { tier: 1, label: '€' },
  { tier: 2, label: '€€' },
  { tier: 3, label: '€€€' },
]

const DISTANCES: { value: number | null; label: string }[] = [
  { value: 800, label: 'À pied' },
  { value: 2000, label: 'Proche' },
  { value: null, label: 'Large' },
]

function heroPhoto(p: PlaceCard): string | null {
  const ph = p.fsq?.photos?.[0]
  if (!ph) return null
  const w = 800
  return `${ph.prefix}${w}x${Math.round(w * (ph.height / ph.width))}${ph.suffix}`
}

export default function SurpriseSheet({
  places,
  knownCuisines = [],
  isMobile = false,
  onClose,
  onSelectPlace,
  onToggleFavorite,
}: Props) {
  const [mood, setMood] = useState<Mood | null>(null)
  const [maxPrice, setMaxPrice] = useState<1 | 2 | 3 | 4 | null>(null)
  const [maxDistance, setMaxDistance] = useState<number | null>(null)
  const [openNow, setOpenNow] = useState(false)
  const [result, setResult] = useState<SurpriseResult | null>(null)
  const [rolling, setRolling] = useState(false)

  const seenRef = useRef<Set<string>>(new Set())

  const opts: SurpriseOptions = useMemo(
    () => ({ mood, maxPrice, maxDistance, openNow, knownCuisines }),
    [mood, maxPrice, maxDistance, openNow, knownCuisines]
  )
  const optsRef = useRef(opts)
  optsRef.current = opts
  const placesRef = useRef(places)
  placesRef.current = places

  const roll = useCallback((reset: boolean) => {
    const o = optsRef.current
    const pool = placesRef.current
    const exclude = reset ? new Set<string>() : seenRef.current
    let res = pickSurprise(pool, { ...o, exclude })
    // Exhausted the pool on a re-roll → start the cycle over.
    if (!res && !reset && seenRef.current.size > 0) {
      seenRef.current = new Set()
      res = pickSurprise(pool, { ...o, exclude: new Set() })
    }
    if (res) {
      const next = reset ? new Set<string>() : new Set(seenRef.current)
      next.add(res.place.osm_id)
      seenRef.current = next
    }
    setResult(res)
  }, [])

  // Re-pick from scratch whenever the criteria change.
  useEffect(() => {
    roll(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, maxPrice, maxDistance, openNow])

  // If the pool fills in after mount (enrichment streaming), pick once.
  useEffect(() => {
    if (!result && places.length > 0) roll(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.length])

  const handleReroll = useCallback(() => {
    setRolling(true)
    roll(false)
    window.setTimeout(() => setRolling(false), 420)
  }, [roll])

  // Esc to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const place = result?.place
  const photo = place ? heroPhoto(place) : null

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '7px 13px',
    borderRadius: 'var(--r-pill)',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--bg)',
    color: active ? '#fff' : 'var(--text-2)',
    transition: 'all 140ms var(--ease-out)',
    whiteSpace: 'nowrap',
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Surprends-moi"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(36,31,24,0.42)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 24,
        animation: 'overlayIn 200ms ease both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar"
        style={{
          width: isMobile ? '100%' : 440,
          maxHeight: isMobile ? '92dvh' : '88vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          borderRadius: isMobile ? '22px 22px 0 0' : 'var(--r-2xl)',
          boxShadow: 'var(--s4)',
          padding: '20px 20px 22px',
          animation: `${isMobile ? 'slideUp' : 'modalIn'} 320ms var(--ease-out) both`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--ember-text)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              <Sparkles size={13} strokeWidth={2} /> Surprends-moi
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: '-0.015em',
                color: 'var(--text)',
                lineHeight: 1.1,
              }}
            >
              Qu&apos;est-ce qui te ferait plaisir&nbsp;?
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Mood chips */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
          {MOODS.map((m) => {
            const active = mood === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMood(active ? null : m.id)}
                aria-pressed={active}
                style={chip(active)}
              >
                <span aria-hidden style={{ marginRight: 5 }}>
                  {m.emoji}
                </span>
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Quick constraints */}
        <div
          style={{
            display: 'flex',
            gap: 7,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 18,
            paddingBottom: 18,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setOpenNow((v) => !v)}
            aria-pressed={openNow}
            style={chip(openNow)}
          >
            Ouvert
          </button>
          <span style={{ width: 1, height: 18, background: 'var(--border)' }} />
          {PRICES.map((p) => {
            const active = maxPrice === p.tier
            return (
              <button
                key={p.tier}
                onClick={() => setMaxPrice(active ? null : p.tier)}
                aria-pressed={active}
                style={chip(active)}
              >
                {p.label}
              </button>
            )
          })}
          <span style={{ width: 1, height: 18, background: 'var(--border)' }} />
          {DISTANCES.map((d) => {
            const active = maxDistance === d.value
            return (
              <button
                key={d.label}
                onClick={() => setMaxDistance(active ? null : d.value)}
                aria-pressed={active}
                style={chip(active)}
              >
                {d.label}
              </button>
            )
          })}
        </div>

        {/* Result */}
        {place ? (
          <div
            key={place.osm_id}
            style={{
              borderRadius: 'var(--r-xl)',
              overflow: 'hidden',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--s2)',
              animation: 'cardIn 380ms var(--ease-out) both',
              opacity: rolling ? 0.55 : 1,
              transform: rolling ? 'scale(0.985)' : 'scale(1)',
              transition: 'opacity 200ms ease, transform 200ms ease',
            }}
          >
            {/* Hero */}
            <button
              onClick={() => onSelectPlace(place)}
              aria-label={`Voir ${place.name}`}
              style={{
                display: 'block',
                width: '100%',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                position: 'relative',
                height: 168,
                background: photo
                  ? undefined
                  : 'linear-gradient(150deg, var(--ember) 0%, var(--ember-hover) 45%, var(--accent) 100%)',
              }}
            >
              {photo && (
                <Image src={photo} alt="" fill sizes="440px" style={{ objectFit: 'cover' }} />
              )}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(transparent 45%, rgba(36,31,24,0.72))',
                }}
              />
              <div
                style={{ position: 'absolute', left: 14, right: 14, bottom: 12, textAlign: 'left' }}
              >
                <h3
                  style={{
                    margin: '0 0 7px',
                    fontFamily: 'var(--font-display)',
                    fontSize: 22,
                    fontWeight: 500,
                    color: '#fff',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.12,
                    textShadow: '0 1px 12px rgba(0,0,0,0.35)',
                  }}
                >
                  {place.name}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {result!.reasons.map((r) => (
                    <span
                      key={r}
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: 'var(--r-pill)',
                        background: 'rgba(255,253,248,0.92)',
                        color: 'var(--text)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <HeartButton
                  isFavorite={!!place.is_favorite}
                  size={19}
                  onClick={() => onToggleFavorite(place)}
                  osmId={place.osm_id}
                  placeSnapshot={place as unknown as Record<string, unknown>}
                />
              </div>
              <button
                onClick={handleReroll}
                className="btn-secondary"
                style={{ flex: 1, width: 'auto' }}
              >
                <Shuffle size={15} strokeWidth={2} className={rolling ? 'fm-spin' : undefined} />
                Une autre
              </button>
              <button
                onClick={() => onSelectPlace(place)}
                className="btn-ember"
                style={{ flex: 1.4, width: 'auto' }}
              >
                Voir <ArrowRight size={15} strokeWidth={2.25} />
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '34px 20px',
              borderRadius: 'var(--r-xl)',
              background: 'var(--bg)',
              border: '1px dashed var(--border-strong)',
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: 'var(--ember-light)',
                color: 'var(--ember-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <MapPin size={22} strokeWidth={1.75} />
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              Rien ne correspond ici
            </p>
            <p
              style={{
                margin: '0 0 16px',
                fontSize: 12.5,
                color: 'var(--text-2)',
                lineHeight: 1.5,
              }}
            >
              Élargis tes critères, ou déplace la carte pour découvrir d&apos;autres adresses.
            </p>
            <button
              onClick={() => {
                setMood(null)
                setMaxPrice(null)
                setMaxDistance(null)
                setOpenNow(false)
              }}
              className="btn-secondary"
              style={{ width: 'auto', margin: '0 auto' }}
            >
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fm-spin-kf { to { transform: rotate(360deg); } }
        .fm-spin { animation: fm-spin-kf 420ms var(--ease-out); }
      `}</style>
    </div>
  )
}
