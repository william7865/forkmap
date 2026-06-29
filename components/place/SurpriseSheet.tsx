'use client'
// ── SurpriseSheet v2 — « Surprends-moi » concierge deck ─────
//   Full-screen, immersive decision experience over the map.
//   • A taste-ranked DECK (not a single pick) you decide through.
//   • Mobile: swipe the top card — → garder, ← passer, ↑ voir.
//   • Web: spotlight card + stack behind, driven by buttons + arrow
//     keys (← passer, → garder, ↑/Enter voir, ⌫ annuler).
//   • Learns: garder/passer feed a persisted taste profile that
//     biases future rankings (lib/taste + lib/surprise.rankDeck).
//   • Undo (rewind), save celebration, photo carousel, end recap.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import type { PlaceCard } from '@/types'
import {
  rankDeck,
  MOODS,
  type Mood,
  type SurpriseOptions,
  type SurpriseResult,
} from '@/lib/surprise'
import { emptyProfile, recordSave, recordPass, isMadeForYou, type TasteProfile } from '@/lib/taste'
import {
  X,
  Heart,
  MapPin,
  Eye,
  RotateCcw,
  Star,
  Clock,
  SlidersHorizontal,
  Undo2,
  Navigation,
  Bookmark,
  Soup,
  Salad,
  Wine,
  Zap,
  Compass,
} from 'lucide-react'
import { SigSparkle } from '@/components/icons/signature'
import type { LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import { frCuisine } from '@/lib/cuisine'

// Humeurs food du deck → icônes lucide (remplace les emojis 🍝🥗🥂⚡🧭)
const MOOD_ICONS: Record<string, ComponentType<LucideProps>> = {
  comfort: Soup,
  healthy: Salad,
  festive: Wine,
  fast: Zap,
  discovery: Compass,
}
import { heavyTap, lightTap } from '@/lib/native/haptics'

interface Props {
  places: PlaceCard[]
  knownCuisines?: string[]
  isMobile?: boolean
  onClose: () => void
  onSelectPlace: (p: PlaceCard) => void
  onToggleFavorite: (p: PlaceCard) => void
  onSeeSaved?: () => void
}

const TASTE_KEY = 'forkmap_taste'
const SWIPE_THRESHOLD = 96

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

function placePhotos(p: PlaceCard): string[] {
  const w = 900
  const fsq = (p.fsq?.photos ?? [])
    .slice(0, 5)
    .map((ph) => `${ph.prefix}${w}x${Math.round(w * (ph.height / ph.width))}${ph.suffix}`)
  if (fsq.length) return fsq
  // Free fallback: Wikidata/Wikimedia image
  return p.wikidata?.image_url ? [p.wikidata.image_url] : []
}

function walkTime(m?: number): string | null {
  if (m == null) return null
  const mins = Math.max(1, Math.round(m / 80))
  return `${mins} min à pied`
}

function todayHours(p: PlaceCard): string | null {
  return p.osm_enriched?.today_hours ?? p.fsq?.hours?.display ?? null
}

function mapsDir(p: PlaceCard) {
  if (typeof window !== 'undefined') {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`,
      '_blank',
      'noopener,noreferrer'
    )
  }
}

function loadProfile(): TasteProfile {
  if (typeof window === 'undefined') return emptyProfile()
  try {
    const raw = localStorage.getItem(TASTE_KEY)
    if (!raw) return emptyProfile()
    const parsed = JSON.parse(raw)
    return parsed?.cuisines ? (parsed as TasteProfile) : emptyProfile()
  } catch {
    return emptyProfile()
  }
}

interface HistoryEntry {
  verdict: 'save' | 'pass'
  place: PlaceCard
  profile: TasteProfile
}

export default function SurpriseSheet({
  places,
  knownCuisines = [],
  isMobile = false,
  onClose,
  onSelectPlace,
  onToggleFavorite,
  onSeeSaved,
}: Props) {
  const [mood, setMood] = useState<Mood | null>(null)
  const [maxPrice, setMaxPrice] = useState<1 | 2 | 3 | 4 | null>(null)
  const [maxDistance, setMaxDistance] = useState<number | null>(null)
  const [openNow, setOpenNow] = useState(false)
  const [refine, setRefine] = useState(false)
  const [tasteReset, setTasteReset] = useState(false)
  const tasteResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (tasteResetTimerRef.current) clearTimeout(tasteResetTimerRef.current)
    },
    []
  )

  const [deck, setDeck] = useState<SurpriseResult[]>([])
  const [index, setIndex] = useState(0)
  const [savedCount, setSavedCount] = useState(0)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const [fly, setFly] = useState<null | 'left' | 'right' | 'up'>(null)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [celebrate, setCelebrate] = useState(false)
  const [canUndo, setCanUndo] = useState(false)

  const profileRef = useRef<TasteProfile>(emptyProfile())
  const seenRef = useRef<Set<string>>(new Set())
  const historyRef = useRef<HistoryEntry[]>([])
  const placesRef = useRef(places)
  placesRef.current = places
  const movedRef = useRef(false)

  const opts: SurpriseOptions = useMemo(
    () => ({ mood, maxPrice, maxDistance, openNow, knownCuisines }),
    [mood, maxPrice, maxDistance, openNow, knownCuisines]
  )
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    profileRef.current = loadProfile()
  }, [])

  const persist = useCallback(() => {
    try {
      localStorage.setItem(TASTE_KEY, JSON.stringify(profileRef.current))
    } catch {
      /* storage may be unavailable — taste just won't persist */
    }
  }, [])

  const buildDeck = useCallback(() => {
    const next = rankDeck(
      placesRef.current,
      { ...optsRef.current, exclude: seenRef.current },
      profileRef.current
    )
    historyRef.current = []
    setCanUndo(false)
    setDeck(next)
    setIndex(0)
    setPhotoIdx(0)
  }, [])

  // Rebuild when criteria change
  useEffect(() => {
    buildDeck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, maxPrice, maxDistance, openNow])

  // Build once the pool arrives (enrichment streaming after mount)
  useEffect(() => {
    if (deck.length === 0 && places.length > 0) buildDeck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.length])

  const current = deck[index]
  const remaining = deck.length - index

  const advance = useCallback(() => {
    setDrag(null)
    setFly(null)
    setPhotoIdx(0)
    setIndex((i) => i + 1)
  }, [])

  const decide = useCallback(
    (verdict: 'save' | 'pass') => {
      const entry = deck[index]
      if (!entry) return
      const place = entry.place
      historyRef.current.push({ verdict, place, profile: profileRef.current })
      setCanUndo(true)
      seenRef.current.add(place.osm_id)
      if (verdict === 'save') {
        profileRef.current = recordSave(profileRef.current, place)
        if (!place.is_favorite) onToggleFavorite(place)
        setSavedCount((c) => c + 1)
        heavyTap()
        setCelebrate(true)
        window.setTimeout(() => setCelebrate(false), 850)
      } else {
        profileRef.current = recordPass(profileRef.current, place)
        lightTap()
      }
      persist()
      setFly(verdict === 'save' ? 'right' : 'left')
      window.setTimeout(advance, 260)
    },
    [deck, index, onToggleFavorite, persist, advance]
  )

  const undo = useCallback(() => {
    const last = historyRef.current.pop()
    setCanUndo(historyRef.current.length > 0)
    if (!last) return
    seenRef.current.delete(last.place.osm_id)
    profileRef.current = last.profile // restore taste snapshot
    persist()
    if (last.verdict === 'save') {
      setSavedCount((c) => Math.max(0, c - 1))
      if (!last.place.is_favorite) onToggleFavorite(last.place) // undo the favorite we added
    }
    setDrag(null)
    setFly(null)
    setPhotoIdx(0)
    setIndex((i) => Math.max(0, i - 1))
  }, [persist, onToggleFavorite])

  const view = useCallback(() => {
    const entry = deck[index]
    if (!entry) return
    profileRef.current = recordSave(profileRef.current, entry.place)
    persist()
    onSelectPlace(entry.place)
  }, [deck, index, onSelectPlace, persist])

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if (e.key === 'Backspace') {
        e.preventDefault()
        return undo()
      }
      if (!current || fly) return
      if (e.key === 'ArrowLeft') decide('pass')
      else if (e.key === 'ArrowRight') decide('save')
      else if (e.key === 'ArrowUp' || e.key === 'Enter') view()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [current, fly, decide, view, undo, onClose])

  // ── Drag (pointer) handlers for the top card ──
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (fly) return
    startRef.current = { x: e.clientX, y: e.clientY }
    movedRef.current = false
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true
    setDrag({ x: dx, y: dy })
  }
  const onPointerUp = () => {
    if (!startRef.current) return
    const d = drag
    startRef.current = null
    if (!d) return
    if (d.x > SWIPE_THRESHOLD) return decide('save')
    if (d.x < -SWIPE_THRESHOLD) return decide('pass')
    if (d.y < -SWIPE_THRESHOLD && Math.abs(d.x) < SWIPE_THRESHOLD) return view()
    setDrag(null) // snap back
  }

  const madeForYou = current ? isMadeForYou(profileRef.current, current.place) : false
  const madeReason = current?.place.cuisine
    ? `Tu aimes ${frCuisine(current.place.cuisine)}`
    : 'Dans tes goûts'
  const topPhotos = current ? placePhotos(current.place) : []

  const photoNav = useCallback(
    (dir: -1 | 1) => {
      if (movedRef.current) return
      if (topPhotos.length === 0) return
      setPhotoIdx((i) => (((i + dir) % topPhotos.length) + topPhotos.length) % topPhotos.length)
    },
    [topPhotos.length]
  )

  // ── chip style (mood) ──
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '7px 13px',
    borderRadius: 'var(--r-pill)',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    border: `1px solid ${active ? 'var(--accent)' : 'rgba(255,255,255,0.28)'}`,
    background: active ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
    color: active ? '#fff' : 'rgba(255,253,248,0.92)',
    transition: 'all 140ms var(--ease-out)',
    whiteSpace: 'nowrap',
    backdropFilter: 'blur(4px)',
  })

  const topTransform = (() => {
    if (fly === 'right') return 'translateX(140%) rotate(18deg)'
    if (fly === 'left') return 'translateX(-140%) rotate(-18deg)'
    if (fly === 'up') return 'translateY(-130%)'
    if (drag) return `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x * 0.04}deg)`
    return 'translate(0,0) rotate(0)'
  })()
  const dragHint = drag ? (drag.x > 40 ? 'save' : drag.x < -40 ? 'pass' : null) : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Surprends-moi"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'linear-gradient(155deg, #2a2018 0%, #1c1611 60%, #0f0b08 100%)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'overlayIn 220ms ease both',
        color: 'var(--bg)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="safe-top"
        style={{
          padding: '16px 18px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#e9a06a',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            <SigSparkle size={13} /> Surprends-moi
          </div>
          <h2
            style={{
              margin: '3px 0 0',
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.015em',
              color: 'var(--bg)',
              lineHeight: 1.1,
            }}
          >
            {savedCount > 0
              ? `${savedCount} gardé${savedCount > 1 ? 's' : ''} ✦`
              : 'Trouvons ton resto'}
          </h2>
        </div>
        <button
          onClick={() => {
            profileRef.current = emptyProfile()
            persist()
            setTasteReset(true)
            if (tasteResetTimerRef.current) clearTimeout(tasteResetTimerRef.current)
            tasteResetTimerRef.current = setTimeout(() => setTasteReset(false), 1500)
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            color: tasteReset ? '#7ee0a8' : 'rgba(255,253,248,0.45)',
            fontFamily: 'var(--font-body)',
            whiteSpace: 'nowrap',
            padding: '4px 2px',
            transition: 'color 200ms ease',
          }}
        >
          {tasteReset ? 'Goûts réinitialisés ✓' : 'Réinitialiser mes goûts'}
        </button>
        <button
          onClick={() => setRefine((v) => !v)}
          aria-label="Affiner"
          aria-pressed={refine}
          style={glassBtn(refine)}
        >
          <SlidersHorizontal size={16} strokeWidth={2} />
        </button>
        <button onClick={onClose} aria-label="Fermer" style={glassBtn(false)}>
          <X size={17} strokeWidth={2} />
        </button>
      </div>

      {/* Mood row */}
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: 7,
          overflowX: 'auto',
          padding: '4px 18px 6px',
          flexShrink: 0,
        }}
      >
        {MOODS.map((m) => {
          const active = mood === m.id
          const MoodIcon = MOOD_ICONS[m.id]
          return (
            <button
              key={m.id}
              onClick={() => setMood(active ? null : m.id)}
              aria-pressed={active}
              style={chip(active)}
            >
              {MoodIcon && (
                <span aria-hidden style={{ marginRight: 6, display: 'inline-flex' }}>
                  <MoodIcon size={14} strokeWidth={2} />
                </span>
              )}
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Refine panel */}
      {refine && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
            padding: '6px 18px 10px',
            flexShrink: 0,
            animation: 'fadeDown 160ms var(--ease-out) both',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <RefineLabel>Prix</RefineLabel>
            <Seg
              items={[
                { label: 'Tous', active: maxPrice == null, onClick: () => setMaxPrice(null) },
                ...PRICES.map((p) => ({
                  label: p.label,
                  active: maxPrice === p.tier,
                  onClick: () => setMaxPrice(maxPrice === p.tier ? null : p.tier),
                })),
              ]}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <RefineLabel>Distance</RefineLabel>
            <Seg
              items={DISTANCES.map((d) => ({
                label: d.label,
                active: maxDistance === d.value,
                onClick: () => setMaxDistance(maxDistance === d.value ? null : d.value),
              }))}
            />
          </div>
          <DarkToggle
            on={openNow}
            onClick={() => setOpenNow((v) => !v)}
            label="Ouvert maintenant"
          />
        </div>
      )}

      {/* ── Deck stage ── */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '6px 16px 0' : '10px 16px 0',
          minHeight: 0,
        }}
      >
        {current ? (
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 420,
              height: '100%',
              maxHeight: 540,
            }}
          >
            {deck.slice(index, index + 3).map((entry, depth) => {
              const isTop = depth === 0
              const z = 30 - depth
              const scale = 1 - depth * 0.05
              const ty = depth * 14
              return (
                <div
                  key={entry.place.osm_id}
                  onPointerDown={isTop ? onPointerDown : undefined}
                  onPointerMove={isTop ? onPointerMove : undefined}
                  onPointerUp={isTop ? onPointerUp : undefined}
                  onClick={
                    isTop
                      ? () => {
                          if (!movedRef.current) view()
                        }
                      : undefined
                  }
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: z,
                    transform: isTop ? topTransform : `translateY(${ty}px) scale(${scale})`,
                    transformOrigin: 'top center',
                    transition: isTop && drag ? 'none' : 'transform 260ms var(--ease-out)',
                    cursor: isTop ? 'grab' : 'default',
                    touchAction: 'none',
                  }}
                >
                  <DeckCard
                    entry={entry}
                    photos={isTop ? topPhotos : placePhotos(entry.place).slice(0, 1)}
                    activePhoto={isTop ? photoIdx : 0}
                    onPhoto={isTop ? photoNav : undefined}
                    onRoute={() => mapsDir(entry.place)}
                    madeForYou={isTop && madeForYou}
                    madeReason={madeReason}
                    dragHint={isTop ? dragHint : null}
                    dim={!isTop}
                  />
                </div>
              )
            })}

            {/* Coup de cœur celebration */}
            {celebrate && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 60,
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Heart
                    size={104}
                    fill="var(--ember)"
                    color="var(--ember)"
                    style={{
                      animation: 'fmHeartPop 820ms var(--ease-spring) both',
                      filter: 'drop-shadow(0 10px 34px rgba(187,94,46,0.6))',
                    }}
                  />
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const ang = (i / 6) * Math.PI * 2
                    const tx = `${Math.round(Math.cos(ang) * 70)}px`
                    const ty = `${Math.round(Math.sin(ang) * 70)}px`
                    return (
                      <span
                        key={i}
                        style={
                          {
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: i % 2 ? '#e9a06a' : 'var(--ember)',
                            '--tx': tx,
                            '--ty': ty,
                            animation: 'heartParticle 700ms var(--ease-out) both',
                          } as React.CSSProperties
                        }
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : places.length === 0 ? (
          <DeckMessage
            title="On cherche les bonnes adresses…"
            body="Déplace ou dézoome la carte si rien n'apparaît."
            spinner
          />
        ) : (
          <DeckMessage
            title={
              savedCount > 0
                ? `Tu as gardé ${savedCount} spot${savedCount > 1 ? 's' : ''} ✦`
                : 'Tu as tout vu par ici'
            }
            body={
              savedCount > 0
                ? 'Reprends quand tu veux, ou retrouve tes adresses gardées sur la carte.'
                : "Élargis la zone, change d'humeur, ou rejoue le deck."
            }
            action={{
              label: 'Rejouer',
              onClick: () => {
                seenRef.current.clear()
                buildDeck()
              },
            }}
            action2={
              savedCount > 0 && onSeeSaved
                ? { label: 'Voir mes enregistrés', icon: 'bookmark', onClick: onSeeSaved }
                : undefined
            }
          />
        )}
      </div>

      {/* ── Action bar ── */}
      {current && (
        <div
          className="safe-bottom"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '14px 18px 18px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={undo}
            aria-label="Annuler"
            disabled={!canUndo}
            style={{
              ...roundBtn(46, 'rgba(255,255,255,0.1)', '#fff'),
              opacity: canUndo ? 1 : 0.35,
              cursor: canUndo ? 'pointer' : 'default',
            }}
          >
            <Undo2 size={19} strokeWidth={2} />
          </button>
          <button
            onClick={() => decide('pass')}
            aria-label="Passer"
            style={roundBtn(58, 'rgba(255,255,255,0.12)', '#fff')}
          >
            <X size={24} strokeWidth={2.5} />
          </button>
          <button
            onClick={view}
            aria-label="Voir le détail"
            style={roundBtn(48, 'rgba(255,255,255,0.12)', '#e9a06a')}
          >
            <Eye size={20} strokeWidth={2} />
          </button>
          <button
            onClick={() => decide('save')}
            aria-label="Garder"
            style={roundBtn(58, 'var(--ember)', '#fff')}
          >
            <Heart size={24} strokeWidth={2.5} fill="#fff" />
          </button>
        </div>
      )}

      {/* Hint line */}
      {current && (
        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'rgba(255,253,248,0.5)',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
            flexShrink: 0,
          }}
        >
          {isMobile
            ? '← passer · ↑ voir · garder →'
            : '← passer  ·  ↑ voir  ·  garder →  ·  ⌫ annuler'}{' '}
          · {remaining} restant{remaining > 1 ? 's' : ''}
        </div>
      )}

      <style>{`
        @keyframes overlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fmHeartPop { 0%{transform:scale(.3);opacity:0} 45%{transform:scale(1.15);opacity:1} 70%{transform:scale(.92)} 100%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function DeckCard({
  entry,
  photos,
  activePhoto,
  onPhoto,
  onRoute,
  madeForYou,
  madeReason,
  dragHint,
  dim,
}: {
  entry: SurpriseResult
  photos: string[]
  activePhoto: number
  onPhoto?: (dir: -1 | 1) => void
  onRoute: () => void
  madeForYou: boolean
  madeReason: string
  dragHint: 'save' | 'pass' | null
  dim: boolean
}) {
  const p = entry.place
  const photo = photos[activePhoto] ?? photos[0] ?? null
  const cuisine = p.cuisine ?? p.fsq?.categories?.[0]?.name
  const rating = p.fsq?.rating
  const price = p.fsq?.price
  const walk = walkTime(p.distance)
  const hours = todayHours(p)
  const hasCarousel = !!onPhoto && photos.length > 1

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 'var(--r-2xl)',
        overflow: 'hidden',
        position: 'relative',
        background: photo
          ? '#1c1611'
          : 'linear-gradient(150deg, var(--ember) 0%, var(--ember-hover) 45%, var(--accent) 100%)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
        border: '1px solid rgba(255,255,255,0.12)',
        userSelect: 'none',
        filter: dim ? 'brightness(0.8)' : 'none',
      }}
    >
      {photo && (
        <Image
          src={photo}
          alt=""
          fill
          sizes="420px"
          style={{ objectFit: 'cover' }}
          draggable={false}
          priority
        />
      )}
      {!photo && (
        <div style={{ position: 'absolute', top: 18, left: 18, color: 'rgba(255,255,255,0.85)' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {cuisine ? frCuisine(cuisine) : 'À découvrir'}
          </span>
        </div>
      )}

      {/* Photo carousel: dots + tap zones (top card only) */}
      {hasCarousel && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 4,
              zIndex: 4,
              padding: '0 60px',
            }}
          >
            {photos.map((_, i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  maxWidth: 40,
                  height: 3,
                  borderRadius: 2,
                  background: i === activePhoto ? '#fff' : 'rgba(255,255,255,0.4)',
                  transition: 'background 150ms',
                }}
              />
            ))}
          </div>
          <button
            aria-label="Photo précédente"
            onClick={(e) => {
              e.stopPropagation()
              onPhoto!(-1)
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '32%',
              height: '55%',
              background: 'none',
              border: 'none',
              cursor: 'default',
              zIndex: 3,
            }}
          />
          <button
            aria-label="Photo suivante"
            onClick={(e) => {
              e.stopPropagation()
              onPhoto!(1)
            }}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '32%',
              height: '55%',
              background: 'none',
              border: 'none',
              cursor: 'default',
              zIndex: 3,
            }}
          />
        </>
      )}

      {/* Decision overlays */}
      {dragHint && (
        <div
          style={{
            position: 'absolute',
            top: 30,
            right: dragHint === 'save' ? 22 : undefined,
            left: dragHint === 'pass' ? 22 : undefined,
            transform: `rotate(${dragHint === 'save' ? -12 : 12}deg)`,
            padding: '6px 14px',
            borderRadius: 10,
            border: `3px solid ${dragHint === 'save' ? '#7ee0a8' : '#ff8a8a'}`,
            color: dragHint === 'save' ? '#7ee0a8' : '#ff8a8a',
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: '0.05em',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 5,
          }}
        >
          {dragHint === 'save' ? 'GARDER' : 'PASSER'}
        </div>
      )}

      {/* Already-saved badge */}
      {p.is_favorite && (
        <span
          style={{
            position: 'absolute',
            top: hasCarousel ? 24 : 16,
            left: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 10.5,
            fontWeight: 700,
            padding: '5px 11px',
            borderRadius: 'var(--r-pill)',
            background: 'var(--ember)',
            color: '#fff',
            zIndex: 4,
          }}
        >
          <Heart size={11} strokeWidth={2.5} fill="#fff" /> Déjà enregistré
        </span>
      )}

      {/* Made-for-you badge (sits below the saved badge when both show) */}
      {madeForYou && (
        <span
          style={{
            position: 'absolute',
            top: (hasCarousel ? 24 : 16) + (p.is_favorite ? 32 : 0),
            left: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 10.5,
            fontWeight: 700,
            padding: '5px 11px',
            borderRadius: 'var(--r-pill)',
            background: 'rgba(255,253,248,0.95)',
            color: 'var(--ember-text)',
            zIndex: 4,
          }}
        >
          <SigSparkle size={12} /> Fait pour toi
        </span>
      )}

      {/* Itinéraire */}
      <button
        aria-label="Itinéraire"
        onClick={(e) => {
          e.stopPropagation()
          onRoute()
        }}
        style={{
          position: 'absolute',
          top: hasCarousel ? 24 : 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: 'rgba(0,0,0,0.42)',
          backdropFilter: 'blur(6px)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4,
        }}
      >
        <Navigation size={16} strokeWidth={2} />
      </button>

      {/* Bottom info */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '64px 18px 18px',
          background: 'linear-gradient(transparent, rgba(15,11,8,0.88) 55%)',
          zIndex: 2,
        }}
      >
        {madeForYou && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              color: '#e9a06a',
              marginBottom: 6,
            }}
          >
            <SigSparkle size={12} /> {madeReason}
          </div>
        )}
        <h3
          style={{
            margin: '0 0 8px',
            fontFamily: 'var(--font-display)',
            fontSize: 27,
            fontWeight: 600,
            color: '#fff',
            letterSpacing: '-0.015em',
            lineHeight: 1.08,
            textShadow: '0 2px 16px rgba(0,0,0,0.4)',
          }}
        >
          {p.name}
        </h3>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 8,
          }}
        >
          {rating != null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 700,
                fontSize: 14,
                color: '#ffd9b8',
              }}
            >
              <Star size={13} fill="#ffd9b8" strokeWidth={0} /> {rating.toFixed(1)}
              {p.fsq?.total_ratings ? (
                <span style={{ fontWeight: 500, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  ({p.fsq.total_ratings})
                </span>
              ) : null}
            </span>
          )}
          {cuisine && (
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.82)' }}>
              {frCuisine(cuisine)}
            </span>
          )}
          {price != null && (
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>
              {'€'.repeat(price)}
            </span>
          )}
          {p.open_now != null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11.5,
                fontWeight: 600,
                color: p.open_now ? '#7ee0a8' : '#ff9a9a',
              }}
            >
              <Clock size={11} strokeWidth={2} /> {p.open_now ? 'Ouvert' : 'Fermé'}
            </span>
          )}
        </div>

        {hours && (
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.62)', marginBottom: 9 }}>
            Aujourd&apos;hui&nbsp;: {hours}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {walk && <Chip>{walk}</Chip>}
          {entry.reasons.slice(0, 2).map((r) => (
            <Chip key={r}>{r}</Chip>
          ))}
        </div>
      </div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: 'var(--r-pill)',
        background: 'rgba(255,255,255,0.16)',
        color: 'rgba(255,253,248,0.95)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {children}
    </span>
  )
}

function DeckMessage({
  title,
  body,
  action,
  action2,
  spinner,
}: {
  title: string
  body: string
  action?: { label: string; onClick: () => void }
  action2?: { label: string; icon?: 'bookmark'; onClick: () => void }
  spinner?: boolean
}) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 320, padding: 24 }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          background: 'rgba(255,255,255,0.1)',
          color: '#e9a06a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        {spinner ? (
          <div
            style={{
              width: 22,
              height: 22,
              border: '2.5px solid rgba(255,255,255,0.2)',
              borderTop: '2.5px solid #e9a06a',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        ) : (
          <MapPin size={26} strokeWidth={1.75} />
        )}
      </div>
      <h3
        style={{
          margin: '0 0 6px',
          fontFamily: 'var(--font-display)',
          fontSize: 21,
          fontWeight: 600,
          color: '#fff',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: '0 0 18px',
          fontSize: 13.5,
          color: 'rgba(255,253,248,0.7)',
          lineHeight: 1.55,
        }}
      >
        {body}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'center' }}>
        {action2 && (
          <button
            onClick={action2.onClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 20px',
              borderRadius: 'var(--r-pill)',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--ember)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
            }}
          >
            {action2.icon === 'bookmark' && <Bookmark size={15} strokeWidth={2.25} />}{' '}
            {action2.label}
          </button>
        )}
        {action && (
          <button
            onClick={action.onClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 'var(--r-pill)',
              border: action2 ? '1px solid rgba(255,255,255,0.25)' : 'none',
              cursor: 'pointer',
              background: action2 ? 'transparent' : 'var(--ember)',
              color: action2 ? 'rgba(255,253,248,0.92)' : '#fff',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
            }}
          >
            <RotateCcw size={15} strokeWidth={2.25} /> {action.label}
          </button>
        )}
      </div>
    </div>
  )
}

function glassBtn(active: boolean): React.CSSProperties {
  return {
    width: 38,
    height: 38,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: active ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
    color: '#fff',
    backdropFilter: 'blur(6px)',
    transition: 'background 140ms ease',
  }
}

function roundBtn(size: number, bg: string, color: string): React.CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: bg,
    color,
    boxShadow: bg.includes('ember') ? 'var(--s-ember)' : '0 4px 14px rgba(0,0,0,0.3)',
    transition: 'transform 120ms var(--ease-spring)',
  }
}

// Dark-theme segmented control (echoes FiltersPanel, adapted to the overlay)
function Seg({ items }: { items: { label: string; active: boolean; onClick: () => void }[] }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 3,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 'var(--r-pill)',
        padding: 3,
      }}
    >
      {items.map((it, i) => (
        <button
          key={i}
          onClick={it.onClick}
          aria-pressed={it.active}
          style={{
            padding: '6px 13px',
            borderRadius: 'var(--r-pill)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            background: it.active ? 'var(--accent)' : 'transparent',
            color: it.active ? '#fff' : 'rgba(255,253,248,0.7)',
            transition: 'background 120ms ease, color 120ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

function DarkToggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
      <span
        role="switch"
        aria-checked={on}
        onClick={onClick}
        style={{
          width: 38,
          height: 22,
          borderRadius: 'var(--r-pill)',
          background: on ? 'var(--accent)' : 'rgba(255,255,255,0.14)',
          border: `1px solid ${on ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}`,
          position: 'relative',
          transition: 'background 160ms ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 17 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'left 160ms var(--ease-out)',
          }}
        />
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'rgba(255,253,248,0.92)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </label>
  )
}

function RefineLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'rgba(255,253,248,0.45)',
        minWidth: 62,
      }}
    >
      {children}
    </span>
  )
}
