'use client'
// PlaceThumb — vignette d'un lieu : photo si dispo, sinon fallback éditorial
// (dégradé déterministe + initiale du nom en serif). Remplit son parent (le
// parent fixe taille / rayon / overflow). Unifie carte, liste, fiche, favoris
// sur un seul traitement — fini les carrés gris + icône fourchette.
// Si une photo échoue au chargement (proxy Google bloqué, image 404…), on
// retombe sur la tuile à initiale au lieu d'un carré d'image cassée.
import { useState, type ReactNode } from 'react'
import { Star } from 'lucide-react'
import type { PlaceCard } from '@/types'

/**
 * Best available photo URL for a place.
 *
 * Deux ordres selon le contexte :
 *
 * - Défaut (galerie de fiche) : Google/FSQ d'abord, puis Wikimedia, Wikidata,
 *   Google/FSQ → Wikimedia (OSM Commons) → Wikidata.
 *
 * Plus de Mapillary : ses photos de rue montraient trop souvent le mauvais
 * bâtiment. On assume plutôt de n'avoir AUCUNE photo (→ mode classement) qu'une
 * fausse façade. `null` ici est un signal exploité : la fiche bascule alors sur
 * son bandeau « score héros » (voir PlaceDetail). Tous les hôtes restants sont
 * déjà dans la CSP img-src.
 */
export function placePhotoUrl(place: PlaceCard, size: number): string | null {
  const google = place.fsq?.photos?.[0]
  if (google) return `${google.prefix}${size}x${size}${google.suffix}`
  return place.osm_enriched?.image_url ?? place.wikidata?.image_url ?? null
}

// Airy light fallback tiles (small thumbs) — a wall of black blocks reads
// heavy, so photo-less small tiles get a soft neutral wash + ink initial.
const LIGHT_TILES: [string, string][] = [
  ['#eef1f3', '#dee3e7'],
  ['#f1efec', '#e2ddd4'],
  ['#ecf1f0', '#dae2e1'],
  ['#eff0f3', '#dfe0e8'],
  ['#f2eff0', '#e3dde1'],
  ['#edf0f2', '#dce2e6'],
]
// Dramatic dark tiles (hero) — white text overlays, so keep it deep.
const DARK_TILES: [string, string][] = [
  ['#3a3d42', '#17181b'],
  ['#403c3a', '#1a1714'],
  ['#3b4042', '#171b1c'],
  ['#3d3d46', '#18181f'],
]

function tileGradient(id: string, tone: 'light' | 'dark'): string {
  const ramp = tone === 'dark' ? DARK_TILES : LIGHT_TILES
  const idx = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % ramp.length
  const [from, to] = ramp[idx]
  return `linear-gradient(150deg, ${from}, ${to})`
}

/** First letter of the name, upper-cased — the fallback tile's typographic mark. */
export function placeInitial(name: string): string {
  const c = name.trim().charAt(0)
  return c ? c.toUpperCase() : '·'
}

interface Props {
  place: PlaceCard
  /** Font size of the fallback initial (px). Scale to the container. */
  initialSize?: number
  /** Requested photo pixel size (square). Defaults to a retina-friendly 240. */
  photoSize?: number
  /** Fallback tone: 'light' (airy small tiles, default) or 'dark' (hero). */
  tone?: 'light' | 'dark'
  /**
   * Superposition (note, statut…) rendue UNIQUEMENT quand une vraie photo
   * s'affiche. C'est PlaceThumb qui sait si l'image a chargé — le parent, non.
   * Le confier ici évite le doublon « badge + tuile-score » quand l'URL existe
   * mais échoue au chargement (proxy Google bloqué, 404…).
   */
  overlay?: ReactNode
}

export default function PlaceThumb({
  place,
  initialSize = 42,
  photoSize = 240,
  tone = 'light',
  overlay,
}: Props) {
  // Track the URL that failed (not a boolean) so a new photo still retries.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const photo = placePhotoUrl(place, photoSize)

  if (photo && photo !== failedUrl) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          loading="lazy"
          onError={() => setFailedUrl(photo)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {overlay}
      </div>
    )
  }

  // Sans photo : tuile-score plutôt que dégradé + initiale. Le classement est la
  // valeur de Forkmap — autant que la note occupe la place de l'image quand il
  // n'y en a pas. Sans note, on retombe sur l'initiale serif (rien à montrer).
  const rating = place.fsq?.rating
  if (rating != null && tone !== 'dark') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: initialSize * 0.12,
        }}
      >
        <Star size={initialSize * 0.7} strokeWidth={0} fill="var(--star)" />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: initialSize * 0.82,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
          }}
        >
          {rating.toFixed(1)}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: tileGradient(place.osm_id, tone),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: initialSize,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: tone === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(24,26,30,0.30)',
        }}
      >
        {placeInitial(place.name)}
      </span>
    </div>
  )
}
