'use client'
// ============================================================
// ListMiniMap — le plan d'une liste : ses adresses, numérotées.
//
// Une liste de six restaurants est d'abord une forme dans la ville. La question
// qu'on se pose en ouvrant « Tables gastro » avant de sortir n'est pas « lequel
// est le mieux noté » mais « lequel est sur mon chemin ». Le plan y répond
// avant qu'on la pose.
//
// Les numéros des pastilles sont ceux des lignes en dessous : on lit la liste
// et la ville en même temps. Pastille pleine = à tester, pastille creuse =
// déjà testée, le seul état que Forkmap connaît et que personne d'autre n'a.
//
// Comme ImportMiniMap, c'est une ILLUSTRATION, pas un contrôle : tous les
// gestes de Leaflet sont coupés. Le tap est capté par le parent, qui ouvre la
// vraie carte. Ne jamais importer ce fichier autrement que par
// `dynamic(..., { ssr: false })` — Leaflet lit `window` à l'import.
// ============================================================
import { useEffect, useRef } from 'react'
import {
  loadLeaflet,
  tileUrl,
  isDarkTheme,
  TILE_ATTRIBUTION,
  type LeafletNS,
} from '@/lib/leaflet-cdn'

export interface MapPoint {
  lat: number
  lon: number
  /** Le numéro affiché, identique à celui de la ligne correspondante. */
  n: number
  /** Déjà visité : la pastille devient creuse. */
  done: boolean
}

/** Pastille numérotée. Pleine = à tester, creuse = testée. */
function pinHtml(n: number, done: boolean): string {
  const size = 24
  const base =
    `width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;` +
    `justify-content:center;font-family:var(--font-display);font-weight:700;font-size:11px;` +
    `line-height:1;letter-spacing:0;`
  const skin = done
    ? 'background:var(--bg);color:var(--text-3);border:1.5px solid var(--text-4,#b4b4b4);'
    : 'background:var(--accent);color:var(--on-accent);border:2px solid var(--bg);' +
      'box-shadow:0 2px 7px rgba(0,0,0,0.26);'
  return `<div style="${base}${skin}">${n}</div>`
}

interface Props {
  points: MapPoint[]
  height?: number
}

export default function ListMiniMap({ points, height = 210 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletNS>(null)

  // Les coordonnées, sérialisées : re-rendre le parent avec un nouveau tableau
  // identique ne doit pas reconstruire la carte.
  const key = points.map((p) => `${p.n}:${p.lat},${p.lon},${p.done ? 1 : 0}`).join('|')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const leaflet = await loadLeaflet()
      const el = containerRef.current
      if (cancelled || !leaflet || !el || points.length === 0) return
      // Un rechargement à chaud peut laisser l'empreinte de Leaflet sur le
      // nœud ; sans ce nettoyage, `map()` jette.
      const tagged = el as unknown as { _leaflet_id?: number }
      if (tagged._leaflet_id) delete tagged._leaflet_id

      const map = leaflet.map(el, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
      })
      leaflet
        .tileLayer(tileUrl(isDarkTheme()), {
          attribution: TILE_ATTRIBUTION,
          subdomains: 'abcd',
          maxZoom: 20,
        })
        .addTo(map)

      for (const p of points) {
        leaflet
          .marker([p.lat, p.lon], {
            icon: leaflet.divIcon({
              className: '',
              html: pinHtml(p.n, p.done),
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            }),
            interactive: false,
            keyboard: false,
          })
          .addTo(map)
      }

      // Cadrage. `fitBounds` sur un point unique zoome au maximum et donne une
      // carte illisible (une rue sans contexte), d'où le cas séparé.
      if (points.length === 1) {
        map.setView([points[0].lat, points[0].lon], 15)
      } else {
        map.fitBounds(
          points.map((p) => [p.lat, p.lon]),
          { padding: [34, 34], maxZoom: 16 }
        )
      }
      mapRef.current = map
    })()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
    // `key` résume les points ; l'identité du tableau ne doit pas compter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, height])

  return (
    <div
      ref={containerRef}
      aria-hidden
      style={{
        height,
        width: '100%',
        background: 'var(--surface-2)',
        // L'empilement interne de Leaflet démarre à 400 ; on le contient.
        zIndex: 0,
        position: 'relative',
      }}
    />
  )
}
