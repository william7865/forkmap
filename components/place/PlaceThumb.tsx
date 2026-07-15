'use client'
// PlaceThumb — vignette d'un lieu : photo si dispo, sinon fallback éditorial
// (dégradé déterministe + initiale du nom en serif). Remplit son parent (le
// parent fixe taille / rayon / overflow). Unifie carte, liste, fiche, favoris
// sur un seul traitement — fini les carrés gris + icône fourchette.
// Si une photo échoue au chargement (proxy Google bloqué, image 404…), on
// retombe sur la tuile à initiale au lieu d'un carré d'image cassée.
import { useState } from 'react'
import type { PlaceCard } from '@/types'

/**
 * Best available photo URL for a place, most-real first:
 *   1. Google/FSQ thumbnail  2. OSM `wikimedia_commons`  3. Wikidata image
 *   4. Mapillary storefront (street-level, last resort)
 * All hosts are already in the CSP img-src, so these load directly.
 */
export function placePhotoUrl(place: PlaceCard, size: number): string | null {
  const p = place.fsq?.photos?.[0]
  if (p) return `${p.prefix}${size}x${size}${p.suffix}`
  return (
    place.osm_enriched?.image_url ??
    place.wikidata?.image_url ??
    place.osm_enriched?.mapillary_url ??
    null
  )
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
}

export default function PlaceThumb({
  place,
  initialSize = 42,
  photoSize = 240,
  tone = 'light',
}: Props) {
  // Track the URL that failed (not a boolean) so a new photo still retries.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const photo = placePhotoUrl(place, photoSize)

  if (photo && photo !== failedUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        loading="lazy"
        onError={() => setFailedUrl(photo)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
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
