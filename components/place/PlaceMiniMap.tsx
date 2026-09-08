'use client'
// PlaceMiniMap — petite carte figée, une seule épingle : « c'est où ».
//
// Elle ouvre la fiche d'un lieu, qu'il vienne d'une vidéo ou de la carte : les
// deux écrans montrent le même objet, ils ouvrent donc de la même façon.
// (Elle s'appelait ImportMiniMap tant qu'un seul écran s'en servait.)
//
// Leaflet lit `window` à l'import : ce fichier ne doit JAMAIS être tiré
// autrement que par `dynamic(..., { ssr: false })`. Ce n'est délibérément pas
// MapView, la carte vivante de l'app (clusters, gestes, zoom) : ici tout est
// coupé, la carte est une illustration, pas un contrôle.
import { useEffect, useRef } from 'react'
import {
  loadLeaflet,
  tileUrl,
  isDarkTheme,
  TILE_ATTRIBUTION,
  type LeafletNS,
} from '@/lib/leaflet-cdn'

/** The same monochrome pin the native map uses — one visual language for a place. */
const PIN_HTML =
  '<div style="width:34px;height:34px;border-radius:50%;background:#1a1a1a;border:2px solid #ffffff;' +
  'box-shadow:0 2px 8px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center">' +
  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/>' +
  '<path d="M21 15V2a5 3 0 0 0-5 3v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></div>'

interface Props {
  lat: number
  lon: number
  height?: number
  /** En héros pleine largeur : ni coins arrondis ni bordure. */
  flush?: boolean
}

export default function PlaceMiniMap({ lat, lon, height = 160, flush = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletNS>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const leaflet = await loadLeaflet()
      const el = containerRef.current
      if (cancelled || !leaflet || !el) return
      // A hot reload can leave Leaflet's marker on the node; clear it or init throws.
      const tagged = el as unknown as { _leaflet_id?: number }
      if (tagged._leaflet_id) delete tagged._leaflet_id

      const map = leaflet.map(el, {
        center: [lat, lon],
        zoom: 15,
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
      leaflet
        .marker([lat, lon], {
          icon: leaflet.divIcon({
            className: '',
            html: PIN_HTML,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          }),
          interactive: false,
          keyboard: false,
        })
        .addTo(map)
      mapRef.current = map
    })()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [lat, lon])

  return (
    <div
      ref={containerRef}
      aria-hidden
      style={{
        height,
        width: '100%',
        borderRadius: flush ? 0 : 16,
        overflow: 'hidden',
        border: flush ? 'none' : '1px solid var(--border)',
        background: 'var(--surface-2)',
        // Leaflet's internal stacking starts at 400; contain it.
        zIndex: 0,
        position: 'relative',
      }}
    />
  )
}
