'use client'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import ShareModal from '@/components/place/ShareModal'
import VisitModal from '@/components/place/VisitModal'
import NoteModal, { getNote } from '@/components/place/NoteModal'
import HeartButton from '@/components/ui/HeartButton'
import StartPanel from '@/components/location/StartPanel'
import type { PlaceCard } from '@/types'
import {
  IcoWalk,
  IcoBike,
  IcoCar,
  IcoPen,
  IcoShare,
  IcoVisit,
  IcoMap,
  IcoPhone,
  IcoGlobe,
  IcoClock,
  IcoArrow,
  IcoRoute,
  IcoStar,
} from '@/components/icons'
import {
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
  UtensilsCrossed,
  Navigation,
} from 'lucide-react'
import type { TransportMode } from '@/lib/hooks/useRouteCache'
import { apiFetch } from '@/lib/api'
import { useDetailEnrichment } from '@/lib/hooks/useDetailEnrichment'
import { frCuisine } from '@/lib/cuisine'
import { isNativeRuntime } from '@/lib/native/platform'
import { nativeShare } from '@/lib/native/share'
import { placeGradient } from '@/lib/gradients'
import PlaceThumb, { placeInitial } from '@/components/place/PlaceThumb'
import PlaceSocialProof from '@/components/place/PlaceSocialProof'
import PhotoGallery, { buildPhotoUrl } from '@/components/place/PhotoGallery'
import ReviewsSection from '@/components/place/ReviewsSection'
import { useAuth } from '@/lib/hooks/useAuth'
import { useReviews } from '@/lib/hooks/useReviews'

// Leaflet touche `window` à l'import — jamais côté serveur.
const MiniMap = dynamic(() => import('@/components/import/ImportMiniMap'), { ssr: false })

// dirflg Apple Maps : w=marche, d=voiture (vélo retombe sur voiture)
const APPLE_FLAG: Record<string, string> = { walking: 'w', bicycling: 'd', driving: 'd' }

// ── Native (Bibliothèque) — briques partagées ──────────────
// En-tête de section serif calme, avec une action discrète optionnelle à droite.
function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        // A 20px serif heading needs room under it — at 12px the title read as
        // glued to its own content rather than introducing it.
        margin: '0 0 16px',
      }}
    >
      <h3
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--text)',
        }}
      >
        {children}
      </h3>
      {action}
    </div>
  )
}

// Divider fin pleine largeur entre grands blocs.
function ThinDivider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '32px 0' }} />
}

// Point séparateur « · » de la ligne méta.
function MetaDot() {
  return <span style={{ color: 'var(--text-4)' }}>·</span>
}

// Étoile dorée pleine (note).
function GoldStar({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--star)" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

// Équipements OSM → chips monochromes (calme,). Le web garde ses
// pastilles colorées ; ici tout est neutre.
function osmFeatureChips(
  e: NonNullable<PlaceCard['osm_enriched']>
): { label: string; icon: React.ReactNode }[] {
  const chips: { label: string; icon: React.ReactNode }[] = []
  const s = 13
  const w = 1.75
  if (e.outdoor_seating) chips.push({ label: 'Terrasse', icon: <Trees size={s} strokeWidth={w} /> })
  if (e.wifi) chips.push({ label: 'Wi-Fi', icon: <Wifi size={s} strokeWidth={w} /> })
  if (e.takeaway)
    chips.push({ label: 'À emporter', icon: <ShoppingBag size={s} strokeWidth={w} /> })
  if (e.delivery) chips.push({ label: 'Livraison', icon: <Truck size={s} strokeWidth={w} /> })
  if (e.reservations)
    chips.push({ label: 'Réservation', icon: <Calendar size={s} strokeWidth={w} /> })
  if (e.dogs_allowed)
    chips.push({ label: 'Chiens OK', icon: <PawPrint size={s} strokeWidth={w} /> })
  if (e.live_music) chips.push({ label: 'Musique live', icon: <Music size={s} strokeWidth={w} /> })
  if (e.organic) chips.push({ label: 'Bio', icon: <Leaf size={s} strokeWidth={w} /> })
  if (e.halal) chips.push({ label: 'Halal', icon: <Moon size={s} strokeWidth={w} /> })
  if (e.kosher) chips.push({ label: 'Kasher', icon: <Star size={s} strokeWidth={w} /> })
  if (e.vegetarian_friendly)
    chips.push({ label: 'Végétarien', icon: <Salad size={s} strokeWidth={w} /> })
  if (e.wheelchair === 'yes')
    chips.push({ label: 'Accessible PMR', icon: <Accessibility size={s} strokeWidth={w} /> })
  if (e.wheelchair === 'limited')
    chips.push({ label: 'PMR partiel', icon: <Accessibility size={s} strokeWidth={w} /> })
  if (e.air_conditioning)
    chips.push({ label: 'Climatisation', icon: <Wind size={s} strokeWidth={w} /> })
  if (e.capacity)
    chips.push({ label: `${e.capacity} couverts`, icon: <Users size={s} strokeWidth={w} /> })
  return chips
}

function openDirections(lat: number, lon: number, gmapsMode: string) {
  if (isNativeRuntime()) {
    const flag = APPLE_FLAG[gmapsMode] ?? 'd'
    // Apple Maps (iOS). Android maps via geo: is a later iteration.
    window.open(`maps://?daddr=${lat},${lon}&dirflg=${flag}`, '_system')
    return
  }
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=${gmapsMode}`,
    '_blank'
  )
}

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
  // Point de départ — révélé ici quand un lieu est sélectionné (flux: chercher → choisir → itinéraire)
  onLocationChange?: (lat: number, lon: number, label: string) => void
  onLocateMe?: () => void
  locating?: boolean
  locateError?: boolean
  locationLabel?: string | null
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

// PhotoGallery + buildPhotoUrl extracted to components/place/PhotoGallery.tsx

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
  place: placeProp,
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
  onLocationChange,
  onLocateMe,
  locating,
  locateError,
  locationLabel,
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

  // Fetch-on-open: upgrades the card with Google data (photos/rating/hours) for
  // the one place on screen. `place` is the enriched copy from here on.
  const place = useDetailEnrichment(placeProp)

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
    const address = [place.address, place.osm_enriched?.city].filter(Boolean).join(', ')
    if (
      await nativeShare({
        title: place.name,
        text: address ? `${place.name}, ${address}` : place.name,
        url: `https://forkmap.vercel.app`,
        dialogTitle: 'Partager ce restaurant',
      })
    )
      return
    setShowShare(true)
  }

  const cuisine = place.cuisine ?? place.fsq?.categories?.[0]?.name
  const currentMode = MODES.find((m) => m.id === routeMode) ?? MODES[0]
  const photos = useMemo(() => place.fsq?.photos ?? [], [place.fsq?.photos])

  // Community reviews (native-only UI). Review photos live only in the reviews
  // section below — they never touch the banner (the place's own photo stays the
  // hero). Memoized so the gallery keeps a stable `urls` reference across
  // re-renders (otherwise its reset effect would snap the swipe back to photo 1).
  const { user } = useAuth()
  const reviewsApi = useReviews(place, user?.id ?? null)
  // Gallery = every real photo we have, deduped, best source first: Google/FSQ
  // photos, then the OSM/Commons & Wikidata venue images, then nearby Mapillary
  // street shots. This is what turns a "one photo or none" fiche into a strip.
  const gallery = useMemo(() => {
    const urls: string[] = []
    const credits = new Set<string>()
    for (const p of photos) {
      urls.push(buildPhotoUrl(p, 600))
      credits.add('Google')
    }
    const e = place.osm_enriched
    if (e?.image_url) {
      urls.push(e.image_url)
      credits.add('Wikimedia')
    }
    if (place.wikidata?.image_url) {
      urls.push(place.wikidata.image_url)
      credits.add('Wikimedia')
    }
    const mly = e?.mapillary_urls ?? (e?.mapillary_url ? [e.mapillary_url] : [])
    for (const m of mly) {
      urls.push(m)
      credits.add('Mapillary')
    }
    const seen = new Set<string>()
    const deduped = urls.filter((u) => (seen.has(u) ? false : (seen.add(u), true)))
    return { urls: deduped, attribution: credits.size ? [...credits].join(' · ') : undefined }
  }, [photos, place.osm_enriched, place.wikidata?.image_url])
  const galleryUrls = gallery.urls

  // Modales partagées entre les deux habillages (état commun).
  const modals = (
    <>
      {showNote && (
        <NoteModal place={place} onClose={() => setShowNote(false)} onSaved={(n) => setNote(n)} />
      )}
      {showShare && <ShareModal place={place} onClose={() => setShowShare(false)} />}
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
    </>
  )

  // ═══════════════════════════════════════════════════════════════════
  // BRANCHE NATIVE — mise en page « Bibliothèque », palette
  // Forkmap conservée. Ordre : héros → nom serif + méta → actions →
  // sections calmes espacées. Même état, mêmes handlers que le web ;
  // seul l'habillage change. Le web (plus bas) reste intact.
  // ═══════════════════════════════════════════════════════════════════
  if (isNativeRuntime()) {
    const heroPhoto = galleryUrls[0] ?? place.wikidata?.image_url ?? null
    const rating = place.fsq?.rating
    const price = place.fsq?.price
    const reviewsCount = place.fsq?.total_ratings
    const michelin = place.wikidata?.michelin_stars ?? place.osm_enriched?.michelin ?? 0
    const distinctions = place.wikidata?.distinctions?.filter((d) => !d.includes('Michelin')) ?? []
    const saved = !!place.is_favorite
    const e = place.osm_enriched
    const featureChips = e ? osmFeatureChips(e) : []
    const description =
      place.wikidata?.description ?? place.osm_enriched?.description ?? place.fsq?.description
    const hours = place.osm_enriched?.today_hours ?? place.fsq?.hours?.display ?? null
    const tel = place.fsq?.tel ?? place.phone
    const website = place.fsq?.website ?? place.website
    const menuUrl = place.osm_enriched?.menu_url
    const bookingUrl = place.osm_enriched?.booking_url
    const instagram = place.osm_enriched?.instagram

    // Chip lien secondaire (outline monochrome).
    const linkChip: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 38,
      padding: '0 14px',
      borderRadius: 999,
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--text-2)',
      textDecoration: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }

    return (
      <>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="place-detail-title"
          style={{
            width: '100%',
            height: '100%',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* ── Héros plein cadre ── */}
          <div
            style={{
              position: 'relative',
              height: 332,
              background: heroPhoto ? undefined : placeGradient(place.osm_id),
              overflow: 'hidden',
            }}
          >
            {galleryUrls.length > 1 ? (
              <PhotoGallery urls={galleryUrls} attribution={gallery.attribution} />
            ) : heroPhoto ? (
              <Image
                src={heroPhoto}
                alt=""
                fill
                sizes="100vw"
                style={{ objectFit: 'cover', animation: 'heroZoom 900ms var(--ease-out) both' }}
                priority
              />
            ) : (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 120,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                {placeInitial(place.name)}
              </span>
            )}

            {/* Voile haut pour la lisibilité du bouton retour */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 96,
                background: 'linear-gradient(rgba(0,0,0,0.28), transparent)',
                pointerEvents: 'none',
              }}
            />
            {/* Voile bas — ancre la photo au contenu, donne de la profondeur */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 88,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.22))',
                pointerEvents: 'none',
              }}
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              style={{
                position: 'absolute',
                top: 'calc(var(--safe-top) + 10px)',
                left: 12,
                width: 38,
                height: 38,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              <ChevronLeft size={20} strokeWidth={2.4} />
            </button>
          </div>

          <div
            className="cascade"
            style={{
              maxWidth: 560,
              margin: '0 auto',
              padding: '20px 20px 40px',
            }}
          >
            {/* ── Nom serif + méta ── */}
            <h2
              id="place-detail-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 30,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1.12,
                color: 'var(--text)',
              }}
            >
              {place.name}
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 7,
                marginTop: 10,
                fontSize: 13.5,
                color: 'var(--text-2)',
              }}
            >
              {rating != null && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontWeight: 700,
                    color: 'var(--text)',
                  }}
                >
                  <GoldStar /> {rating.toFixed(1)}
                  {/* The review count used to justify a whole "Note" section that
                      restated this very rating, bigger. It's a footnote to the
                      number, so it lives next to the number. */}
                  {reviewsCount ? (
                    <span style={{ fontWeight: 500, color: 'var(--text-3)' }}>
                      ({reviewsCount.toLocaleString('fr-FR')})
                    </span>
                  ) : null}
                </span>
              )}
              {cuisine && (
                <>
                  {rating != null && <MetaDot />}
                  <span>{frCuisine(cuisine)}</span>
                </>
              )}
              {price != null && (
                <>
                  <MetaDot />
                  <span>{'€'.repeat(price)}</span>
                </>
              )}
              {place.open_now !== undefined && (
                <>
                  {(rating != null || cuisine || price != null) && <MetaDot />}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontWeight: 600,
                      color: place.open_now ? 'var(--open)' : 'var(--closed)',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'currentColor',
                      }}
                    />
                    {place.open_now ? 'Ouvert' : 'Fermé'}
                  </span>
                </>
              )}
            </div>

            {/* Distinctions Michelin / autres */}
            {(michelin > 0 || distinctions.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
                {michelin > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 12px',
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text)',
                    }}
                  >
                    <span style={{ display: 'inline-flex', gap: 1 }}>
                      {Array.from({ length: michelin }).map((_, i) => (
                        <Star key={i} size={11} fill="var(--star)" strokeWidth={0} />
                      ))}
                    </span>
                    Michelin
                  </span>
                )}
                {distinctions.map((d) => (
                  <span
                    key={d}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '5px 12px',
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-2)',
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}

            {/* ── Actions : enregistrer · itinéraire · partager ── */}
            <div style={{ marginTop: 20 }}>
              {/* Enregistrer — div-bouton pour héberger le HeartButton (popup listes)
                  sans imbriquer deux <button>. Un tap sur le cœur déclenche son
                  propre onClick (stopPropagation) ; ailleurs, le div bascule. */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onToggleFavorite(place)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    onToggleFavorite(place)
                  }
                }}
                aria-label={saved ? 'Retirer des enregistrements' : 'Enregistrer'}
                className="tap-press"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  height: 48,
                  borderRadius: 14,
                  border: saved ? '1px solid var(--border)' : 'none',
                  background: saved ? 'var(--surface)' : 'var(--accent)',
                  color: saved ? 'var(--text)' : 'var(--on-accent)',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 700,
                  boxShadow: saved ? 'none' : 'var(--s2)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <HeartButton
                    isFavorite={saved}
                    size={17}
                    onClick={() => onToggleFavorite(place)}
                    osmId={place.osm_id}
                    placeSnapshot={place as unknown as Record<string, unknown>}
                    colorOverride={saved ? 'var(--accent)' : 'var(--on-accent)'}
                  />
                </span>
                {saved ? 'Enregistré' : 'Enregistrer'}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => openDirections(place.lat, place.lon, currentMode.gmaps)}
                  className="tap-press"
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
                  <Navigation size={15} /> Itinéraire
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Partager ce restaurant"
                  className="tap-press"
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
                  <IcoShare /> Partager
                </button>
              </div>

              {/* Liens secondaires (Appeler / Site / Menu / Réserver / Instagram) */}
              {(tel || website || menuUrl || bookingUrl || instagram) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {tel && (
                    <a href={`tel:${tel}`} style={linkChip}>
                      <IcoPhone /> Appeler
                    </a>
                  )}
                  {website && (
                    <a href={website} target="_blank" rel="noopener noreferrer" style={linkChip}>
                      <IcoGlobe /> Site
                    </a>
                  )}
                  {menuUrl && (
                    <a href={menuUrl} target="_blank" rel="noopener noreferrer" style={linkChip}>
                      <UtensilsCrossed size={14} strokeWidth={1.75} /> Menu
                    </a>
                  )}
                  {bookingUrl && (
                    <a href={bookingUrl} target="_blank" rel="noopener noreferrer" style={linkChip}>
                      <CalendarCheck size={14} strokeWidth={1.75} /> Réserver
                    </a>
                  )}
                  {instagram && (
                    <a
                      href={`https://instagram.com/${instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkChip}
                    >
                      <ExternalLink size={14} strokeWidth={1.75} /> Instagram
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* ── Note + note perso + visite (actions secondaires) ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setShowNote(true)}
                aria-label="Note personnelle"
                style={{ ...linkChip, height: 38, position: 'relative' }}
              >
                <IcoPen /> Note
                {note && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                    }}
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedVisit(null)
                  setShowVisit(true)
                }}
                aria-label="Logger une visite"
                style={{ ...linkChip, height: 38 }}
              >
                <IcoVisit /> Visites
                {visitCount != null && visitCount > 0 && (
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{visitCount}</span>
                )}
              </button>
              {cuisine && onCuisineFilter && (
                <button
                  type="button"
                  onClick={() => onCuisineFilter(cuisine)}
                  aria-label={`Filtrer par cuisine : ${frCuisine(cuisine)}`}
                  style={{ ...linkChip, height: 38 }}
                >
                  {frCuisine(cuisine)}
                </button>
              )}
            </div>

            {/* Pas de section « Note » : elle répétait, en plus gros, la note déjà
                lue à côté du nom — et sur un barème (/10) qui entrait en collision
                avec le /5 des avis communautaires plus bas. Le nombre d'avis a
                rejoint la ligne méta. */}

            {/* ── Horaires ── */}
            {hours && (
              <>
                <ThinDivider />
                <SectionTitle>Horaires</SectionTitle>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {place.osm_enriched?.today_hours ? (
                    <>
                      Aujourd&apos;hui : <strong style={{ color: 'var(--text)' }}>{hours}</strong>
                    </>
                  ) : (
                    hours
                  )}
                </p>
              </>
            )}

            {/* ── Équipements ── */}
            {featureChips.length > 0 && (
              <>
                <ThinDivider />
                <SectionTitle>Équipements</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {featureChips.map((c) => (
                    <span
                      key={c.label}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 13px',
                        borderRadius: 999,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text-2)',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ display: 'inline-flex', color: 'var(--text-3)' }} aria-hidden>
                        {c.icon}
                      </span>
                      {c.label}
                    </span>
                  ))}
                </div>
                {place.osm_enriched?.payment_methods &&
                  place.osm_enriched.payment_methods.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginTop: 12,
                        fontSize: 13,
                        color: 'var(--text-3)',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Paiement :</span>
                      {place.osm_enriched.payment_methods
                        .map((m) =>
                          m === 'cash'
                            ? 'Espèces'
                            : m === 'card'
                              ? 'Carte'
                              : m === 'contactless'
                                ? 'Sans contact'
                                : m
                        )
                        .join(' · ')}
                    </div>
                  )}
              </>
            )}

            {/* ── À propos ── */}
            {description && (
              <>
                <ThinDivider />
                <SectionTitle>À propos</SectionTitle>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
                  {description}
                </p>
                {place.wikidata?.wikipedia_url && (
                  <a
                    href={place.wikidata.wikipedia_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-3)',
                      textDecoration: 'none',
                    }}
                  >
                    <IcoGlobe /> Lire sur Wikipédia →
                  </a>
                )}
              </>
            )}

            {/* Pas de section « Y aller » : un panneau d'itinéraire de 200 lignes
                pendant que le bouton « Itinéraire » est en haut et que « Où » donne
                l'adresse et la mini-carte. Trois fois la même intention. */}

            {/* ── Avis communautaires (app-only) ── */}
            <ReviewsSection api={reviewsApi} isSignedIn={!!user} placeName={place.name} />

            {/* ── Amis qui ont enregistré / visité ── */}
            <PlaceSocialProof osmId={place.osm_id} />

            {/* ── Où (adresse + mini-carte) ── */}
            <ThinDivider />
            <SectionTitle>Où</SectionTitle>
            {place.address && (
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  marginBottom: 12,
                }}
              >
                <span style={{ flexShrink: 0, marginTop: 1, color: 'var(--text-3)' }}>
                  <IcoMap />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55 }}>
                    {place.address}
                  </span>
                  {place.osm_enriched?.district && (
                    <span
                      style={{
                        display: 'block',
                        fontSize: 12,
                        color: 'var(--text-3)',
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      {place.osm_enriched.district}
                    </span>
                  )}
                </div>
                <CopyAddressButton
                  text={[place.address, place.osm_enriched?.district ?? place.osm_enriched?.city]
                    .filter(Boolean)
                    .join(', ')}
                />
              </div>
            )}
            <div
              style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}
            >
              <MiniMap lat={place.lat} lon={place.lon} height={170} />
            </div>

            {/* ── Moi ici ──
                « Ma note » et « Mes visites » étaient deux sections séparées, en
                plus des actions secondaires en haut : trois endroits pour une même
                chose, « mes données sur ce resto ». Un seul bloc, un seul titre.
                Le compte des visites vit dans les tuiles, pas dans le titre. */}
            {(note || visits.length > 0) && (
              <>
                <ThinDivider />
                <SectionTitle>Moi ici</SectionTitle>
              </>
            )}

            {note && (
              <button
                type="button"
                onClick={() => setShowNote(true)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '13px 15px',
                  marginBottom: visits.length > 0 ? 12 : 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  color: 'var(--text-2)',
                  lineHeight: 1.6,
                }}
              >
                {note}
              </button>
            )}

            {visits.length > 0 && (
              <>
                {(() => {
                  const rated = visits.filter((v) => v.personal_rating != null)
                  const spent = visits.filter((v) => v.amount_spent != null && v.amount_spent > 0)
                  const avgRating = rated.length
                    ? rated.reduce((s, v) => s + (v.personal_rating ?? 0), 0) / rated.length
                    : null
                  const avgSpend = spent.length
                    ? Math.round(
                        spent.reduce((s, v) => s + (v.amount_spent ?? 0), 0) / spent.length
                      )
                    : null
                  const last = visits[0]?.visited_at
                  const tiles: { v: string; l: string }[] = [
                    { v: String(visits.length), l: visits.length > 1 ? 'visites' : 'visite' },
                  ]
                  if (last)
                    tiles.push({
                      v: new Date(last).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      }),
                      l: 'dernière',
                    })
                  if (avgRating != null)
                    tiles.push({ v: `${avgRating.toFixed(1)}★`, l: 'note moy.' })
                  if (avgSpend != null) tiles.push({ v: `${avgSpend} €`, l: 'par repas' })
                  return (
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        marginBottom: 12,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                        padding: '13px 12px',
                      }}
                    >
                      {tiles.map((t, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: 17,
                              fontWeight: 600,
                              color: 'var(--text)',
                              letterSpacing: '-0.01em',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {t.v}
                          </div>
                          <div
                            style={{
                              fontSize: 9.5,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              color: 'var(--text-4)',
                              fontWeight: 600,
                              marginTop: 2,
                            }}
                          >
                            {t.l}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: visits.length > 3 ? 150 : undefined,
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
                        padding: '9px 0',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: 'var(--text-2)',
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
                        <Calendar size={12} strokeWidth={1.75} />{' '}
                        {new Date(v.visited_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {v.personal_rating != null && (
                          <span style={{ marginLeft: 8, color: 'var(--star)' }}>
                            {'★'.repeat(v.personal_rating)}
                          </span>
                        )}
                        {v.mood && MOOD_LABELS[v.mood] && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-3)' }}>
                            {MOOD_LABELS[v.mood] ?? v.mood}
                          </span>
                        )}
                        {v.amount_spent != null && (
                          <span style={{ marginLeft: 6, color: 'var(--text-3)' }}>
                            {v.amount_spent}€
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        aria-label="Modifier cette visite"
                        onClick={() => {
                          setSelectedVisit(v)
                          setShowVisit(true)
                        }}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 10,
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-3)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IcoPen />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── À proximité ── */}
            {nearbyPlaces.length > 0 && (
              <>
                <ThinDivider />
                <SectionTitle>À proximité</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                        type="button"
                        onClick={() => onSelectPlace?.(p)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '11px 0',
                          borderBottom: '1px solid var(--border)',
                          border: 'none',
                          borderBottomStyle: 'solid',
                          background: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'var(--font-body)',
                          width: '100%',
                        }}
                      >
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 14,
                            flexShrink: 0,
                            overflow: 'hidden',
                            position: 'relative',
                            boxShadow: 'var(--s1)',
                          }}
                        >
                          <PlaceThumb place={p} initialSize={22} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: '0 0 3px',
                              fontFamily: 'var(--font-display)',
                              fontSize: 16.5,
                              fontWeight: 600,
                              color: 'var(--text)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              letterSpacing: '-0.01em',
                            }}
                          >
                            {p.name}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              color: 'var(--text-3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            {r != null && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  color: 'var(--text-2)',
                                  fontWeight: 600,
                                }}
                              >
                                <GoldStar size={11} /> {r.toFixed(1)}
                              </span>
                            )}
                            {c && r != null && <MetaDot />}
                            {c && <span>{frCuisine(c)}</span>}
                            {d && (c || r != null) && <MetaDot />}
                            {d && <span>{d}</span>}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── Source ── */}
            <a
              href={`https://www.openstreetmap.org/${place.osm_type}/${place.osm_id.split('/')[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: 26,
                fontSize: 12,
                color: 'var(--text-4)',
                textDecoration: 'none',
              }}
            >
              Voir sur OpenStreetMap
            </a>
          </div>
        </div>
        {modals}
        <style>{`@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }`}</style>
      </>
    )
  }

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
        // Banner photo: first gallery photo (user photos first, then FSQ/Google),
        // falling back to the free sources — OSM Commons, Wikidata, then the
        // Mapillary storefront — so the banner matches the list card.
        const photoUrl =
          galleryUrls[0] ??
          place.osm_enriched?.image_url ??
          place.wikidata?.image_url ??
          place.osm_enriched?.mapillary_url ??
          null

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
              background: photoUrl ? undefined : placeGradient(place.osm_id),
              overflow: 'hidden',
            }}
          >
            {galleryUrls.length > 1 ? (
              // Multiple photos → swipeable gallery (dots + snap)
              <PhotoGallery urls={galleryUrls} attribution={gallery.attribution} />
            ) : photoUrl ? (
              <Image
                src={photoUrl}
                alt=""
                fill
                sizes="100vw"
                style={{ objectFit: 'cover', animation: 'heroZoom 900ms var(--ease-out) both' }}
                priority
              />
            ) : (
              // Editorial fallback: the place's initial in the display serif,
              // over its deterministic gradient (no photo → still branded).
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 96,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                {placeInitial(place.name)}
              </span>
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
                      background: place.open_now ? 'var(--open)' : 'var(--closed)',
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
                    {frCuisine(cuisine)}
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
          // Wrap so a 4th action (Voir le menu) never overflows on narrow mobile;
          // Itinéraire keeps flex:1 and fills the first row, the rest wrap under.
          flexWrap: 'wrap',
          gap: 8,
          padding: '10px 14px',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => openDirections(place.lat, place.lon, 'walking')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '9px 12px',
            borderRadius: 10,
            background: 'var(--forest-mid)',
            color: 'var(--on-accent)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          <IcoRoute /> Itinéraire
        </button>
        {place.osm_enriched?.menu_url && (
          <a
            href={place.osm_enriched.menu_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1.5px solid var(--accent)',
              background: 'var(--accent-light)',
              color: 'var(--accent)',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <UtensilsCrossed size={13} strokeWidth={1.75} /> Voir le menu
          </a>
        )}
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
        className="cascade"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* Friends who saved / visited this place (renders nothing if none) */}
        <PlaceSocialProof osmId={place.osm_id} />

        {/* Community reviews (rating + text + photos) */}
        <ReviewsSection api={reviewsApi} isSignedIn={!!user} placeName={place.name} />

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
              border: `1px solid ${note ? 'rgba(25,28,29,0.35)' : 'var(--ink-10)'}`,
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
              e.currentTarget.style.borderColor = 'rgba(25,28,29,0.3)'
              e.currentTarget.style.color = 'var(--forest-mid)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = note ? 'var(--forest-pale)' : 'var(--off-white)'
              e.currentTarget.style.borderColor = note ? 'rgba(25,28,29,0.35)' : 'var(--ink-10)'
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
              border: `1px solid ${visitCount ? 'rgba(25,28,29,0.35)' : 'var(--ink-10)'}`,
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
              e.currentTarget.style.borderColor = 'rgba(25,28,29,0.4)'
              e.currentTarget.style.color = 'var(--amber)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = visitCount
                ? 'var(--amber-pale)'
                : 'var(--off-white)'
              e.currentTarget.style.borderColor = visitCount
                ? 'rgba(25,28,29,0.35)'
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
              aria-label={`Filtrer par cuisine : ${frCuisine(cuisine)}`}
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
              {frCuisine(cuisine)}
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
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(28,25,23,0.08)',
              }}
            >
              {onLocationChange && onLocateMe ? (
                <StartPanel
                  userLocation={null}
                  locationLabel={locationLabel ?? null}
                  onLocationChange={onLocationChange}
                  onLocateMe={onLocateMe}
                  locating={!!locating}
                  locateError={!!locateError}
                />
              ) : (
                <div
                  style={{
                    padding: '14px',
                    background: 'rgba(28,25,23,0.03)',
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
              )}
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

                    {/* Maps CTA — ouvre Plans natif en natif, Google Maps en web */}
                    <button
                      type="button"
                      onClick={() => openDirections(place.lat, place.lon, currentMode.gmaps)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        padding: '11px 14px',
                        borderRadius: 10,
                        background: 'var(--forest-mid)',
                        color: 'var(--on-accent)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12.5,
                        fontWeight: 700,
                        letterSpacing: '-0.01em',
                        boxShadow: '0 4px 16px rgba(29,74,53,0.25)',
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--forest)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--forest-mid)')}
                    >
                      Ouvrir dans Maps <IcoArrow />
                    </button>
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
                  border: '1px solid rgba(25,28,29,0.25)',
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
                    border: '1px solid rgba(25,28,29,0.25)',
                  }}
                >
                  {d}
                </span>
              ))}
          </div>
        )}

        {/* ── Description (Wikidata/Wikipedia > OSM > FSQ) ── */}
        {(place.wikidata?.description ||
          place.osm_enriched?.description ||
          place.fsq?.description) && (
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
              {place.wikidata?.description ??
                place.osm_enriched?.description ??
                place.fsq?.description}
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
            <CopyAddressButton
              text={[place.address, place.osm_enriched?.district ?? place.osm_enriched?.city]
                .filter(Boolean)
                .join(', ')}
            />
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
                boxShadow: '0 4px 12px rgba(25,28,29,0.3)',
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
              border: '1px solid rgba(25,28,29,0.2)',
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
            {/* Personal history digest — computed from the visits already loaded */}
            {(() => {
              const rated = visits.filter((v) => v.personal_rating != null)
              const spent = visits.filter((v) => v.amount_spent != null && v.amount_spent > 0)
              const avgRating = rated.length
                ? rated.reduce((s, v) => s + (v.personal_rating ?? 0), 0) / rated.length
                : null
              const avgSpend = spent.length
                ? Math.round(spent.reduce((s, v) => s + (v.amount_spent ?? 0), 0) / spent.length)
                : null
              const last = visits[0]?.visited_at // API returns newest-first
              const tiles: { v: string; l: string }[] = [
                { v: String(visits.length), l: visits.length > 1 ? 'visites' : 'visite' },
              ]
              if (last)
                tiles.push({
                  v: new Date(last).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                  l: 'dernière',
                })
              if (avgRating != null) tiles.push({ v: `${avgRating.toFixed(1)}★`, l: 'note moy.' })
              if (avgSpend != null) tiles.push({ v: `${avgSpend} €`, l: 'par repas' })
              return (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 10,
                    background: 'var(--off-white)',
                    border: '1px solid var(--ink-10)',
                    borderRadius: 'var(--r-md)',
                    padding: '11px 12px',
                  }}
                >
                  {tiles.map((t, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 16,
                          fontWeight: 600,
                          color: 'var(--ink)',
                          letterSpacing: '-0.01em',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {t.v}
                      </div>
                      <div
                        style={{
                          fontSize: 9.5,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--ink-40)',
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        {t.l}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
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
                      e.currentTarget.style.borderColor = 'rgba(25,28,29,0.35)'
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
                      e.currentTarget.style.borderColor = 'rgba(25,28,29,0.25)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--off-white)'
                      e.currentTarget.style.borderColor = 'var(--ink-10)'
                    }}
                  >
                    {/* Mini thumb — photo or light editorial tile (consistent) */}
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        flexShrink: 0,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <PlaceThumb place={p} initialSize={16} />
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
                            {frCuisine(c)}
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

// Bouton « copier l'adresse » avec retour visuel.
function CopyAddressButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  if (!text) return null
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard indispo */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      aria-label="Copier l'adresse"
      style={{
        flexShrink: 0,
        alignSelf: 'center',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 10px',
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        background: copied ? 'var(--open-bg)' : 'rgba(28,25,23,0.06)',
        color: copied ? 'var(--open)' : 'var(--ink-60)',
        fontSize: 11.5,
        fontWeight: 700,
        fontFamily: 'var(--font-body)',
        transition: 'background 140ms ease, color 140ms ease',
      }}
    >
      {copied ? (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Copié
        </>
      ) : (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copier
        </>
      )}
    </button>
  )
}
