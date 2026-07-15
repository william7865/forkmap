'use client'
// ImportMiniMap — a small, frozen map with a single pin: "where it is".
//
// Leaflet touches `window` at import time, so this file must only ever be pulled
// in via `dynamic(..., { ssr: false })` (the import detail does exactly that).
// It is deliberately NOT MapView: MapView is the app's live map (clusters, move
// handlers, search-here pill, zoom control). Here everything is off — no drag,
// no zoom, no keyboard — the map is an illustration, not a control.
import { useEffect, useRef } from 'react'

// Leaflet is loaded from the CDN at runtime and has no types here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type L = any

/** Load a CDN asset once, and resolve when it has actually settled. Mirrors
 *  MapView's loader and reuses its element ids, so the map page that already
 *  paid for Leaflet doesn't download it twice. */
function loadAsset(tag: 'script' | 'link', id: string, attrs: Record<string, string>) {
  return new Promise<void>((res) => {
    const existing = document.getElementById(id) as HTMLElement | null
    if (existing) {
      if (existing.dataset.settled === '1') res()
      else {
        existing.addEventListener('load', () => res(), { once: true })
        existing.addEventListener('error', () => res(), { once: true })
      }
      return
    }
    const el = document.createElement(tag)
    el.id = id
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
    const settle = () => {
      el.dataset.settled = '1'
      res()
    }
    el.onload = settle
    el.onerror = settle
    document.head.appendChild(el)
  })
}

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
}

export default function ImportMiniMap({ lat, lon, height = 160 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await loadAsset('link', 'lf-css', {
        rel: 'stylesheet',
        href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      })
      await loadAsset('script', 'lf-js', {
        src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        crossorigin: '',
      })
      const el = containerRef.current
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const leaflet: L = (window as any).L
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
        .tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
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
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
        // Leaflet's internal stacking starts at 400; contain it.
        zIndex: 0,
        position: 'relative',
      }}
    />
  )
}
