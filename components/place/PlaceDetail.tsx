'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import ShareModal from '@/components/place/ShareModal'
import VisitModal from '@/components/place/VisitModal'
import NoteModal, { getNote } from '@/components/place/NoteModal'
import HeartButton from '@/components/ui/HeartButton'
import type { PlaceCard, FoursquarePhoto } from '@/types'
import {
  IcoWalk,
  IcoBike,
  IcoCar,
  IcoPen,
  IcoShare,
  IcoVisit,
  IcoX,
  IcoMap,
  IcoPhone,
  IcoGlobe,
  IcoClock,
  IcoArrow,
  IcoRoute,
  IcoStar,
} from '@/components/icons'
import {
  Camera,
  Trees,
  Wifi,
  ShoppingBag,
  Truck,
  Calendar,
  PawPrint,
  Music,
  Leaf,
  Moon,
  Salad,
  Accessibility,
  Wind,
  Users,
  CalendarCheck,
  ExternalLink,
  Star,
  ChevronLeft,
} from 'lucide-react'
import type { TransportMode } from '@/lib/hooks/useRouteCache'
import { apiFetch } from '@/lib/api'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

interface RouteResult {
  duration: number
  distance: number
  coords: [number, number][]
}

interface Props {
  place: PlaceCard
  onClose: () => void
  onToggleFavorite: (p: PlaceCard) => void
  onSelectPlace?: (p: PlaceCard) => void
  nearbyPlaces?: PlaceCard[]
  routeResult?: RouteResult | null
  routeLoading?: boolean
  routeMode?: TransportMode
  hasUserLocation?: boolean
  onTransportChange?: (mode: TransportMode) => void
  onCuisineFilter?: (cuisine: string) => void
}

const MODES: { id: TransportMode; icon: React.ReactNode; label: string; gmaps: string }[] = [
  { id: 'foot', icon: <IcoWalk />, label: 'Marche', gmaps: 'walking' },
  { id: 'bike', icon: <IcoBike />, label: 'Vélo', gmaps: 'bicycling' },
  { id: 'car', icon: <IcoCar />, label: 'Voiture', gmaps: 'driving' },
]

function fmt(secs: number) {
  const m = Math.round(secs / 60)
  if (m < 1) return '< 1 min'
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim()
}
function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

// ── Photo gallery ──────────────────────────────────────────
function buildPhotoUrl(photo: FoursquarePhoto, width = 600): string {
  return `${photo.prefix}${width}x${Math.round(width * (photo.height / photo.width))}${photo.suffix}`
}

function PhotoGallery({ photos }: { photos: FoursquarePhoto[] }) {
  const [activePhoto, setActivePhoto] = useState(0)
  const galleryRef = useRef<HTMLDivElement>(null)

  // Reset when photos change (new place selected)
  useEffect(() => {
    setActivePhoto(0)
    if (galleryRef.current) galleryRef.current.scrollLeft = 0
  }, [photos])

  if (!photos.length) return null

  const handleGalleryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth)
    setActivePhoto(idx)
  }

  const urls = photos.map((p) => buildPhotoUrl(p, 600))

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {/* Horizontal scrollable strip */}
      <div
        ref={galleryRef}
        onScroll={handleGalleryScroll}
        className="no-scrollbar"
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          gap: 0,
        }}
      >
        {urls.map((url, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: '100%',
              height: 200,
              scrollSnapAlign: 'start',
              position: 'relative',
            }}
          >
            <Image src={url} alt="" fill sizes="100vw" style={{ objectFit: 'cover' }} />
          </div>
        ))}
      </div>
      {/* Dot indicators */}
      {photos.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {photos.slice(0, 5).map((_, i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: i === activePhoto ? 'white' : 'rgba(255,255,255,0.45)',
                transition: 'background 150ms',
              }}
            />
          ))}
          {photos.length > 5 && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', alignSelf: 'center' }}>
              +{photos.length - 5}
            </span>
          )}
        </div>
      )}
      {/* Attribution */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 8,
          fontSize: 9,
          color: 'rgba(255,255,255,0.55)',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Camera size={9} strokeWidth={1.5} /> Foursquare
      </div>
    </div>
  )
}

// Animated rating bar
function RatingBar({ rating }: { rating: number }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setW((rating / 10) * 100), 80)
    return () => clearTimeout(t)
  }, [rating])
  const color =
    rating >= 8 ? 'var(--rating-high)' : rating >= 6 ? 'var(--rating-mid)' : 'var(--rating-low)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          flex: 1,
          height: 5,
          borderRadius: 3,
          background: 'rgba(28,25,23,0.07)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${w}%`,
            background: color,
            borderRadius: 3,
            transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>
      <span
        style={{
          fontSize: 16,
          fontWeight: 800,
          color,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 34,
          textAlign: 'right',
          letterSpacing: '-0.03em',
        }}
      >
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

function Label({ children }: { children?: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink-40)',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(28,25,23,0.06)', margin: '0 -16px' }} />
}

export default function PlaceDetail({
  place,
  onClose,
  onToggleFavorite,
  onSelectPlace,
  nearbyPlaces = [],
  routeResult,
  routeLoading,
  routeMode = 'foot',
  hasUserLocation,
  onTransportChange,
  onCuisineFilter,
}: Props) {
  interface VisitRow {
    id: string
    visited_at: string
    amount_spent?: number
    people_count: number
    personal_rating?: number
    mood?: string
    note?: string
  }

  const MOOD_LABELS: Record<string, string> = {
    solo: 'Solo',
    couple: 'En couple',
    friends: 'Entre amis',
    family: 'En famille',
    work: 'Pro',
  }

  const [showShare, setShowShare] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [showVisit, setShowVisit] = useState(false)
  const [visitCount, setVisitCount] = useState<number | null>(null)
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [selectedVisit, setSelectedVisit] = useState<VisitRow | null>(null)
  const [note, setNote] = useState(() =>
    typeof window !== 'undefined' ? getNote(place.osm_id) : ''
  )
  // Update note when place changes
  useEffect(() => {
    setNote(getNote(place.osm_id))
  }, [place.osm_id])

  const fetchVisits = async () => {
    try {
      const { getSupabaseBrowserClient } = await import('@/lib/hooks/useAuth')
      const sb = getSupabaseBrowserClient()
      const {
        data: { session },
      } = await sb.auth.getSession()
      if (!session?.access_token) return
      const res = await apiFetch(`/api/visits?osm_id=${encodeURIComponent(place.osm_id)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const rows: VisitRow[] = data.data ?? []
        setVisits(rows)
        setVisitCount(rows.length)
      }
    } catch {}
  }

  // Fetch visits for this place
  useEffect(() => {
    fetchVisits()
  }, [place.osm_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleShare = async () => {
    if (Capacitor.isNativePlatform()) {
      const address = [place.address, place.osm_enriched?.city].filter(Boolean).join(', ')
      await Share.share({
        title: place.name,
        text: address ? `${place.name}, ${address}` : place.name,
        url: `https://forkmap.vercel.app`,
        dialogTitle: 'Partager ce restaurant',
      })
    } else {
      setShowShare(true)
    }
  }

  const cuisine = place.cuisine ?? place.fsq?.categories?.[0]?.name
  const currentMode = MODES.find((m) => m.id === routeMode) ?? MODES[0]
  const photos = place.fsq?.photos ?? []

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="place-detail-title"
      className="anim-slide-up"
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--white)',
        borderRadius: 'var(--r-xl)',
        boxShadow:
          '0 24px 64px rgba(14,14,13,0.16), 0 4px 16px rgba(14,14,13,0.08), 0 0 0 1px rgba(14,14,13,0.07)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Photo banner with overlay ── */}
      {(() => {
        const firstPhoto = photos[0]
        // Free photo fallback: Wikidata/Wikimedia image when no Foursquare photo
        const photoUrl = firstPhoto
          ? buildPhotoUrl(firstPhoto, 600)
          : (place.wikidata?.image_url ?? null)

        const glassBtnStyle: React.CSSProperties = {
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(6px)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 150ms ease',
        }

        return (
          <div
            style={{
              position: 'relative',
              height: 200,
              flexShrink: 0,
              background: photoUrl
                ? undefined
                : 'linear-gradient(150deg, var(--ember) 0%, var(--ember-hover) 42%, var(--accent) 100%)',
              overflow: 'hidden',
            }}
          >
            {photoUrl && (
              <Image
                src={photoUrl}
                alt=""
                fill
                sizes="100vw"
                style={{ objectFit: 'cover' }}
                priority
              />
            )}

            {/* Glassmorphism buttons on photo */}
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                right: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 2,
              }}
            >
              <button
                onClick={onClose}
                aria-label="Fermer"
                style={glassBtnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.55)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.35)'
                }}
              >
                <ChevronLeft size={18} strokeWidth={2.5} />
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={glassBtnStyle}>
                  <HeartButton
                    isFavorite={!!place.is_favorite}
                    size={16}
                    onClick={() => onToggleFavorite(place)}
                    osmId={place.osm_id}
                    placeSnapshot={place as unknown as Record<string, unknown>}
                    colorOverride="white"
                  />
                </div>
                <button
                  onClick={handleShare}
                  aria-label="Partager ce restaurant"
                  style={glassBtnStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.55)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.35)'
                  }}
                >
                  <IcoShare />
                </button>
              </div>
            </div>

            {/* Overlay gradient with name + badges */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '40px 14px 12px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                zIndex: 1,
              }}
            >
              <h2
                id="place-detail-title"
                style={{
                  margin: '0 0 6px',
                  fontFamily: 'var(--font-display)',
                  fontSize: 23,
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.12,
                  color: 'white',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {place.name}
              </h2>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {place.open_now !== undefined && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      borderRadius: 'var(--r-pill)',
                      fontSize: 10,
                      fontWeight: 600,
                      background: place.open_now ? 'rgba(45,122,85,0.85)' : 'rgba(180,40,40,0.75)',
                      color: 'white',
                    }}
                  >
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'currentColor',
                        flexShrink: 0,
                      }}
                    />
                    {place.open_now ? 'Ouvert' : 'Fermé'}
                  </span>
                )}
                {place.fsq?.rating != null && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <IcoStar /> {place.fsq.rating.toFixed(1)}
                  </span>
                )}
                {place.fsq?.price != null && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                    {'€'.repeat(place.fsq.price)}
                  </span>
                )}
                {cuisine && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.7)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {cuisine}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Quick actions row ── */}
      <div
        style={{
          background: 'var(--white)',
          borderBottom: '1px solid var(--ink-10)',
          display: 'flex',
          gap: 8,
          padding: '10px 14px',
          flexShrink: 0,
        }}
      >
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}&travelmode=walking`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '9px 12px',
            borderRadius: 10,
            background: 'var(--forest-mid)',
            color: 'white',
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          <IcoRoute /> Itinéraire
        </a>
        {(place.fsq?.tel ?? place.phone) && (
          <a
            href={`tel:${place.fsq?.tel ?? place.phone}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1.5px solid var(--ink-10)',
              background: 'var(--white)',
              color: 'var(--ink-80)',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <IcoPhone /> Appeler
          </a>
        )}
        {(place.fsq?.website ?? place.website) && (
          <a
            href={place.fsq?.website ?? place.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1.5px solid var(--ink-10)',
              background: 'var(--white)',
              color: 'var(--ink-80)',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <IcoGlobe /> Site web
          </a>
        )}
      </div>

      <Divider />

      {/* ── SCROLLABLE BODY ─────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* Secondary actions: Note + Visite + cuisine filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowNote(true)}
            aria-label="Note personnelle"
            title={note ? 'Modifier ma note' : 'Ajouter une note'}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 'var(--r-sm)',
              border: `1px solid ${note ? 'rgba(45,122,85,0.35)' : 'var(--ink-10)'}`,
              background: note ? 'var(--forest-pale)' : 'var(--off-white)',
              color: note ? 'var(--forest-mid)' : 'var(--ink-60)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'background 150ms ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--forest-pale)'
              e.currentTarget.style.borderColor = 'rgba(45,122,85,0.3)'
              e.currentTarget.style.color = 'var(--forest-mid)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = note ? 'var(--forest-pale)' : 'var(--off-white)'
              e.currentTarget.style.borderColor = note ? 'rgba(45,122,85,0.35)' : 'var(--ink-10)'
              e.currentTarget.style.color = note ? 'var(--forest-mid)' : 'var(--ink-60)'
            }}
          >
            <IcoPen /> Note
            {note && (
              <span
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--forest-mid)',
                  border: '1px solid white',
                }}
              />
            )}
          </button>

          <button
            onClick={() => {
              setSelectedVisit(null)
              setShowVisit(true)
            }}
            aria-label="Logger une visite"
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 'var(--r-sm)',
              border: `1px solid ${visitCount ? 'rgba(196,124,43,0.35)' : 'var(--ink-10)'}`,
              background: visitCount ? 'var(--amber-pale)' : 'var(--off-white)',
              color: visitCount ? 'var(--amber)' : 'var(--ink-60)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'background 150ms ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--amber-pale)'
              e.currentTarget.style.borderColor = 'rgba(196,124,43,0.4)'
              e.currentTarget.style.color = 'var(--amber)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = visitCount
                ? 'var(--amber-pale)'
                : 'var(--off-white)'
              e.currentTarget.style.borderColor = visitCount
                ? 'rgba(196,124,43,0.35)'
                : 'var(--ink-10)'
              e.currentTarget.style.color = visitCount ? 'var(--amber)' : 'var(--ink-60)'
            }}
          >
            <IcoVisit /> Visites
            {visitCount != null && visitCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 15,
                  height: 15,
                  borderRadius: '50%',
                  background: 'var(--amber)',
                  border: '2px solid white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  fontWeight: 700,
                  color: 'white',
                  padding: '0 2px',
                }}
              >
                {visitCount > 9 ? '9+' : visitCount}
              </span>
            )}
          </button>

          {cuisine && onCuisineFilter && (
            <button
              onClick={() => onCuisineFilter(cuisine)}
              aria-label={`Filtrer par cuisine : ${cuisine}`}
              style={{
                cursor: 'pointer',
                background: 'none',
                border: '1px solid var(--ink-10)',
                borderRadius: 'var(--r-pill)',
                padding: '3px 8px',
                fontSize: 11,
                color: 'var(--ink-60)',
                fontFamily: 'var(--font-body)',
                height: 34,
              }}
            >
              {cuisine}
            </button>
          )}
        </div>

        {/* Rating */}
        {place.fsq?.rating != null && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Label>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IcoStar /> Note
                </span>
              </Label>
              {place.fsq.total_ratings && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-60)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {place.fsq.total_ratings.toLocaleString()} avis
                </span>
              )}
            </div>
            <RatingBar rating={place.fsq.rating} />
          </div>
        )}

        {/* Route section */}
        <div>
          <Label>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IcoRoute />
              {hasUserLocation ? 'Depuis votre départ' : 'Y aller'}
            </span>
          </Label>

          {!hasUserLocation ? (
            <div
              style={{
                padding: '14px',
                borderRadius: 12,
                background: 'rgba(28,25,23,0.03)',
                border: '1px solid rgba(28,25,23,0.07)',
                fontSize: 12,
                color: 'var(--ink-60)',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              Définissez un point de départ
              <br />
              pour voir les itinéraires
            </div>
          ) : (
            <div
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(28,25,23,0.08)',
                background: 'rgba(28,25,23,0.02)',
              }}
            >
              {/* Transport mode tabs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3,1fr)',
                  background: 'rgba(28,25,23,0.03)',
                }}
              >
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onTransportChange?.(m.id)}
                    aria-pressed={routeMode === m.id}
                    aria-label={m.label}
                    style={{
                      padding: '11px 4px 9px',
                      border: 'none',
                      cursor: 'pointer',
                      background: routeMode === m.id ? 'var(--white)' : 'transparent',
                      borderBottom: `2px solid ${routeMode === m.id ? 'var(--forest-mid)' : 'transparent'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      color: routeMode === m.id ? 'var(--forest-mid)' : 'var(--ink-60)',
                      transition: 'all 120ms ease',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span aria-hidden="true">{m.icon}</span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>

              <div style={{ padding: '14px 14px 12px' }}>
                {routeLoading ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px 0',
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        border: '2px solid rgba(28,25,23,0.1)',
                        borderTop: '2px solid var(--forest-mid)',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--ink-60)' }}>Calcul en cours…</span>
                  </div>
                ) : routeResult ? (
                  <>
                    {/* Time + distance row */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'var(--ink-40)',
                            marginBottom: 3,
                          }}
                        >
                          Temps de trajet
                        </div>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 800,
                            color: 'var(--forest-mid)',
                            letterSpacing: '-0.05em',
                            lineHeight: 1,
                          }}
                        >
                          {fmt(routeResult.duration)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'var(--ink-40)',
                            marginBottom: 3,
                          }}
                        >
                          Distance
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: 'var(--ink-80)',
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {fmtDist(routeResult.distance)}
                        </div>
                      </div>
                    </div>

                    {/* Route on map indicator */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11,
                        color: 'var(--ink-60)',
                        marginBottom: 12,
                        padding: '6px 10px',
                        background: 'rgba(28,25,23,0.03)',
                        borderRadius: 8,
                        border: '1px solid rgba(28,25,23,0.06)',
                      }}
                    >
                      <IcoRoute />
                      Trajet sur la carte
                    </div>

                    {/* Google Maps CTA */}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}&travelmode=${currentMode.gmaps}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        padding: '11px 14px',
                        borderRadius: 10,
                        background: 'var(--forest-mid)',
                        color: 'white',
                        textDecoration: 'none',
                        fontSize: 12.5,
                        fontWeight: 700,
                        letterSpacing: '-0.01em',
                        boxShadow: '0 4px 16px rgba(29,74,53,0.25)',
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--forest)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--forest-mid)')}
                    >
                      Ouvrir dans Google Maps <IcoArrow />
                    </a>
                  </>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      padding: '8px 0',
                      textAlign: 'center',
                      fontSize: 12,
                      color: 'var(--ink-60)',
                    }}
                  >
                    Sélectionnez un restaurant pour calculer l&apos;itinéraire
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Distinctions Michelin / Wikidata ── */}
        {(place.wikidata?.michelin_stars ||
          place.wikidata?.distinctions?.length ||
          place.osm_enriched?.michelin) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(place.wikidata?.michelin_stars ?? place.osm_enriched?.michelin) && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  borderRadius: 'var(--r-pill)',
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'var(--amber-pale)',
                  color: 'var(--amber)',
                  border: '1px solid rgba(196,124,43,0.25)',
                }}
              >
                <span style={{ display: 'inline-flex', gap: 1 }}>
                  {Array.from({
                    length: place.wikidata?.michelin_stars ?? place.osm_enriched?.michelin ?? 0,
                  }).map((_, i) => (
                    <Star key={i} size={10} fill="currentColor" strokeWidth={0} />
                  ))}
                </span>{' '}
                Michelin
              </span>
            )}
            {place.wikidata?.distinctions
              ?.filter((d) => !d.includes('Michelin'))
              .map((d) => (
                <span
                  key={d}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 12px',
                    borderRadius: 'var(--r-pill)',
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'var(--amber-pale)',
                    color: 'var(--amber)',
                    border: '1px solid rgba(196,124,43,0.25)',
                  }}
                >
                  {d}
                </span>
              ))}
          </div>
        )}

        {/* ── Description (Wikidata/Wikipedia > FSQ) ── */}
        {(place.wikidata?.description || place.fsq?.description) && (
          <div>
            <Label>À propos</Label>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--ink-80)',
                lineHeight: 1.7,
                letterSpacing: '-0.01em',
              }}
            >
              {place.wikidata?.description ?? place.fsq?.description}
            </p>
            {place.wikidata?.wikipedia_url && (
              <a
                href={place.wikidata.wikipedia_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 6,
                  fontSize: 11,
                  color: 'var(--ink-40)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                <IcoGlobe /> Lire sur Wikipedia →
              </a>
            )}
          </div>
        )}

        {/* ── Horaires (OSM parsé > FSQ) ── */}
        {(place.osm_enriched?.today_hours || place.fsq?.hours?.display) && (
          <div>
            <Label>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <IcoClock />
                Horaires
              </span>
            </Label>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-80)' }}>
              {place.osm_enriched?.today_hours ? (
                <>
                  Aujourd&apos;hui : <strong>{place.osm_enriched.today_hours}</strong>
                </>
              ) : (
                place.fsq?.hours?.display
              )}
            </p>
          </div>
        )}

        {/* ── Features pills ── */}
        {(() => {
          const e = place.osm_enriched
          if (!e) return null
          const pills: { label: string; icon: React.ReactNode; color: string; bg: string }[] = []
          if (e.outdoor_seating)
            pills.push({
              label: 'Terrasse',
              icon: <Trees size={10} strokeWidth={1.75} />,
              color: 'var(--forest)',
              bg: 'var(--forest-pale)',
            })
          if (e.wifi)
            pills.push({
              label: 'Wi-Fi',
              icon: <Wifi size={10} strokeWidth={1.75} />,
              color: 'var(--sky)',
              bg: 'var(--sky-pale)',
            })
          if (e.takeaway)
            pills.push({
              label: 'À emporter',
              icon: <ShoppingBag size={10} strokeWidth={1.75} />,
              color: 'var(--ink-60)',
              bg: 'var(--cream)',
            })
          if (e.delivery)
            pills.push({
              label: 'Livraison',
              icon: <Truck size={10} strokeWidth={1.75} />,
              color: 'var(--ink-60)',
              bg: 'var(--cream)',
            })
          if (e.reservations)
            pills.push({
              label: 'Réservation',
              icon: <Calendar size={10} strokeWidth={1.75} />,
              color: 'var(--ink-60)',
              bg: 'var(--cream)',
            })
          if (e.dogs_allowed)
            pills.push({
              label: 'Chiens OK',
              icon: <PawPrint size={10} strokeWidth={1.75} />,
              color: 'var(--ink-60)',
              bg: 'var(--cream)',
            })
          if (e.live_music)
            pills.push({
              label: 'Musique live',
              icon: <Music size={10} strokeWidth={1.75} />,
              color: 'var(--amber)',
              bg: 'var(--amber-pale)',
            })
          if (e.organic)
            pills.push({
              label: 'Bio',
              icon: <Leaf size={10} strokeWidth={1.75} />,
              color: 'var(--forest)',
              bg: 'var(--forest-pale)',
            })
          if (e.halal)
            pills.push({
              label: 'Halal',
              icon: <Moon size={10} strokeWidth={1.75} />,
              color: 'var(--forest)',
              bg: 'var(--forest-pale)',
            })
          if (e.kosher)
            pills.push({
              label: 'Kasher',
              icon: <Star size={10} strokeWidth={1.75} />,
              color: 'var(--sky)',
              bg: 'var(--sky-pale)',
            })
          if (e.vegetarian_friendly)
            pills.push({
              label: 'Végétarien',
              icon: <Salad size={10} strokeWidth={1.75} />,
              color: 'var(--forest)',
              bg: 'var(--forest-pale)',
            })
          if (e.wheelchair === 'yes')
            pills.push({
              label: 'Accessible PMR',
              icon: <Accessibility size={10} strokeWidth={1.75} />,
              color: 'var(--sky)',
              bg: 'var(--sky-pale)',
            })
          if (e.wheelchair === 'limited')
            pills.push({
              label: 'PMR partiel',
              icon: <Accessibility size={10} strokeWidth={1.75} />,
              color: 'var(--amber)',
              bg: 'var(--amber-pale)',
            })
          if (e.air_conditioning)
            pills.push({
              label: 'Climatisation',
              icon: <Wind size={10} strokeWidth={1.75} />,
              color: 'var(--sky)',
              bg: 'var(--sky-pale)',
            })
          if (!pills.length && !e.capacity) return null
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {pills.map((p) => (
                <span
                  key={p.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 'var(--r-pill)',
                    fontSize: 11,
                    fontWeight: 600,
                    background: p.bg,
                    color: p.color,
                    border: 'none',
                  }}
                >
                  <span aria-hidden="true">{p.icon}</span> {p.label}
                </span>
              ))}
              {e.capacity && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 'var(--r-pill)',
                    fontSize: 11,
                    fontWeight: 600,
                    background: 'var(--cream)',
                    color: 'var(--ink-60)',
                  }}
                >
                  <span aria-hidden="true">
                    <Users size={10} strokeWidth={1.75} />
                  </span>{' '}
                  {e.capacity} couverts
                </span>
              )}
            </div>
          )
        })()}

        {/* ── Modes de paiement ── */}
        {place.osm_enriched?.payment_methods && place.osm_enriched.payment_methods.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--ink-40)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Paiement :
            </span>
            {place.osm_enriched.payment_methods.map((m) => (
              <span
                key={m}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--r-pill)',
                  fontSize: 10,
                  fontWeight: 600,
                  background: 'var(--off-white)',
                  color: 'var(--ink-60)',
                  border: '1px solid var(--ink-10)',
                  textTransform: 'capitalize',
                }}
              >
                {m === 'cash'
                  ? 'Espèces'
                  : m === 'card'
                    ? 'Carte'
                    : m === 'contactless'
                      ? 'Sans contact'
                      : m}
              </span>
            ))}
          </div>
        )}

        {/* ── Adresse ── */}
        {place.address && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '11px 13px',
              borderRadius: 12,
              background: 'rgba(28,25,23,0.03)',
              border: '1px solid rgba(28,25,23,0.07)',
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 1, color: 'var(--ink-60)' }}>
              <IcoMap />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-80)', lineHeight: 1.55 }}>
                {place.address}
              </span>
              {place.osm_enriched?.district && (
                <span
                  style={{
                    display: 'block',
                    fontSize: 10,
                    color: 'var(--ink-40)',
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {place.osm_enriched.district}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── CTA buttons (booking + instagram only — phone/website in quick actions row) ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {place.osm_enriched?.booking_url && (
            <a
              href={place.osm_enriched.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '11px 12px',
                borderRadius: 10,
                background: 'var(--amber)',
                color: 'white',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(196,124,43,0.3)',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              <CalendarCheck size={12} strokeWidth={1.75} /> Réserver
            </a>
          )}
          {place.osm_enriched?.instagram && (
            <a
              href={`https://instagram.com/${place.osm_enriched.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '11px 14px',
                borderRadius: 10,
                background: 'rgba(28,25,23,0.04)',
                border: '1.5px solid rgba(28,25,23,0.1)',
                color: 'var(--ink-80)',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              <ExternalLink size={12} strokeWidth={1.75} /> Instagram
            </a>
          )}
        </div>

        {/* ── Note personnelle ── */}
        {note && (
          <button
            onClick={() => setShowNote(true)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 9,
              padding: '10px 12px',
              background: 'var(--forest-pale)',
              border: '1px solid rgba(45,122,85,0.2)',
              borderLeft: '3px solid var(--forest-mid)',
              borderRadius: 'var(--r-md)',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              fontFamily: 'var(--font-body)',
              transition: 'all 120ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--forest-pale)'
              e.currentTarget.style.borderLeftColor = 'var(--forest)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--forest-pale)'
              e.currentTarget.style.borderLeftColor = 'var(--forest-mid)'
            }}
          >
            <IcoPen />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: '0 0 2px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--forest-mid)',
                }}
              >
                Ma note
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'var(--ink-80)',
                  lineHeight: 1.5,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                }}
              >
                {note}
              </p>
            </div>
          </button>
        )}

        {/* ── Mes visites ── */}
        {visits.length > 0 && (
          <div>
            <Label>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <IcoVisit /> Mes visites ({visits.length})
              </span>
            </Label>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                maxHeight: visits.length > 3 ? 130 : undefined,
                overflowY: visits.length > 3 ? 'auto' : undefined,
              }}
            >
              {visits.map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 0',
                    borderBottom: '1px solid var(--ink-10)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-80)',
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Calendar size={11} strokeWidth={1.75} />{' '}
                    {new Date(v.visited_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {v.personal_rating != null && (
                      <span style={{ marginLeft: 8, color: 'var(--accent)' }}>
                        {'★'.repeat(v.personal_rating)}
                      </span>
                    )}
                    {v.mood && MOOD_LABELS[v.mood] && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-3)' }}>
                        {MOOD_LABELS[v.mood] ?? v.mood}
                      </span>
                    )}
                    {v.amount_spent != null && (
                      <span style={{ marginLeft: 6, color: 'var(--ink-60)' }}>
                        {v.amount_spent}€
                      </span>
                    )}
                  </span>
                  <button
                    aria-label="Modifier cette visite"
                    onClick={() => {
                      setSelectedVisit(v)
                      setShowVisit(true)
                    }}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 'var(--r-sm)',
                      background: 'var(--off-white)',
                      border: '1px solid var(--ink-10)',
                      color: 'var(--ink-60)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--amber-pale)'
                      e.currentTarget.style.borderColor = 'rgba(196,124,43,0.35)'
                      e.currentTarget.style.color = 'var(--amber)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--off-white)'
                      e.currentTarget.style.borderColor = 'var(--ink-10)'
                      e.currentTarget.style.color = 'var(--ink-60)'
                    }}
                  >
                    <IcoPen />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Restaurants similaires ── */}
        {nearbyPlaces.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <span
                style={{
                  display: 'block',
                  width: 10,
                  height: 1.5,
                  background: 'var(--forest-mid)',
                }}
              />
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--forest-mid)',
                }}
              >
                À proximité
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {nearbyPlaces.slice(0, 3).map((p) => {
                const c = p.cuisine ?? p.fsq?.categories?.[0]?.name
                const r = p.fsq?.rating
                const d =
                  p.distance == null
                    ? null
                    : p.distance < 1000
                      ? `${Math.round(p.distance)} m`
                      : `${(p.distance / 1000).toFixed(1)} km`
                return (
                  <button
                    key={p.osm_id}
                    onClick={() => onSelectPlace?.(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 11px',
                      borderRadius: 'var(--r-md)',
                      border: '1px solid var(--ink-10)',
                      background: 'var(--off-white)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 150ms ease',
                      fontFamily: 'var(--font-body)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--forest-pale)'
                      e.currentTarget.style.borderColor = 'rgba(45,122,85,0.25)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--off-white)'
                      e.currentTarget.style.borderColor = 'var(--ink-10)'
                    }}
                  >
                    {/* Mini gradient thumb */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        flexShrink: 0,
                        background: c ? `linear-gradient(135deg,#1a2e1a,#3d6e3d)` : 'var(--cream)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M9 4v8c0 2.5 1 4 3 4.5V21M15 4v5c0 1-.7 1.5-1.5 1.5S12 10 12 9V4M15 9.5c0 2 1.5 3 3 3V21"
                          stroke="rgba(255,255,255,0.7)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: '0 0 2px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {p.name}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10,
                          color: 'var(--ink-60)',
                          display: 'flex',
                          gap: 6,
                        }}
                      >
                        {c && (
                          <span
                            style={{
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              fontWeight: 600,
                              color: 'var(--forest-mid)',
                            }}
                          >
                            {c}
                          </span>
                        )}
                        {d && <span>{d}</span>}
                      </p>
                    </div>
                    {r != null && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--ink-60)',
                          flexShrink: 0,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {r.toFixed(1)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <a
          href={`https://www.openstreetmap.org/${place.osm_type}/${place.osm_id.split('/')[1]}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            textAlign: 'center',
            fontSize: 10,
            color: 'var(--ink-40)',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          Voir sur OpenStreetMap
        </a>
      </div>

      {/* Note modal */}
      {showNote && (
        <NoteModal place={place} onClose={() => setShowNote(false)} onSaved={(n) => setNote(n)} />
      )}

      {/* Share modal */}
      {showShare && <ShareModal place={place} onClose={() => setShowShare(false)} />}

      {/* Visit modal */}
      {showVisit && (
        <VisitModal
          place={place}
          existingVisit={selectedVisit}
          onClose={() => {
            setShowVisit(false)
            setSelectedVisit(null)
          }}
          onSaved={() => {
            fetchVisits()
          }}
        />
      )}

      <style>{`@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }`}</style>
    </div>
  )
}
