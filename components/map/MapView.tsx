'use client'
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { IcoSearch } from '@/components/icons'
import type { PlaceCard } from '@/types'
import { lightTap } from '@/lib/native/haptics'
import { isNativeRuntime } from '@/lib/native/platform'

// Accent des marqueurs : noir monochrome (unifié avec l'app native).
function mapAccent(): string {
  return '#0a0a0a'
}
// Encre du corps de marqueur : noir pur (unifié avec l'app native).
function mapInk(): string {
  return '#0a0a0a'
}
// Anneau de pulsation (sélection) : noir monochrome (unifié avec l'app native).
function mapPulseRing(): string {
  return 'rgba(10,10,10,0.30)'
}

export interface MapViewHandle {
  flyTo: (lat: number, lon: number, zoom?: number) => void
  /** Fly to the user's own location. Waits for the (async-loaded) Leaflet map to
   *  be ready, then on mobile shifts the target up so the dot lands in the strip
   *  above the bottom sheet instead of dead-center behind it. */
  flyToUser: (lat: number, lon: number, zoom?: number) => void
  fitBounds: (points: [number, number][]) => void
  drawRoute: (coords: [number, number][], color?: string) => void
  clearRoute: () => void
  enablePinDrop: () => void
  disablePinDrop: () => void
  getBounds: () => {
    minLon: number
    minLat: number
    maxLon: number
    maxLat: number
    centerLat: number
    centerLon: number
  } | null
}

interface BBox {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
  centerLat: number
  centerLon: number
}
interface Props {
  places: PlaceCard[]
  selectedId?: string
  hoveredId?: string | null
  userLocation?: [number, number] | null
  onMoveEnd: (b: BBox) => void
  onMarkerClick: (p: PlaceCard) => void
  onMarkerHover: (id: string | null) => void
  onPinDrop?: (lat: number, lon: number) => void
  showSearchHere?: boolean
  onSearchHere?: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type A = any

function loadAsset(
  tag: 'script' | 'link',
  id: string,
  attrs: Record<string, string>
): Promise<void> {
  return new Promise((res) => {
    const existing = document.getElementById(id) as HTMLElement | null
    if (existing) {
      // An element left behind by an earlier mount may still be in flight. Resolving
      // on its mere presence let leaflet.markercluster run before `window.L` existed.
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

type MState = 'default' | 'hover' | 'selected' | 'favorite'

// ── Marqueurs — design exact du brandbook ─────────────────
// Default: teardrop ink + cercle blanc
// Avec note: teardrop ink + cercle blanc + texte note
// Favori: teardrop accent + cercle blanc + coeur SVG
// Sélectionné: teardrop blanc + bordure ink + cercle ink + point blanc
// Inactif: teardrop bone/stone + cercle stone
// Marqueur natif « Monochrome Premium » : pastille ronde à icône couvert (maquette Stitch).
function nativeMarkerHTML(state: MState): string {
  const isSelected = state === 'selected'
  const isHover = state === 'hover'
  const dark = isSelected || state === 'favorite'
  const d = isSelected ? 44 : isHover ? 40 : 34
  const bg = dark ? '#1a1a1a' : 'rgba(255,255,255,0.95)'
  const fg = dark ? '#ffffff' : '#444748'
  const border = dark ? '2px solid #ffffff' : '1.5px solid #c4c7c7'
  const shadow = isSelected
    ? '0 6px 18px rgba(0,0,0,0.30)'
    : isHover
      ? '0 4px 12px rgba(0,0,0,0.22)'
      : '0 2px 8px rgba(0,0,0,0.16)'
  const isz = Math.round(d * 0.5)
  const icon =
    `<svg width="${isz}" height="${isz}" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/>` +
    `<path d="M21 15V2a5 3 0 0 0-5 3v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`
  return `<div style="width:${d}px;height:${d}px;border-radius:50%;background:${bg};border:${border};box-shadow:${shadow};display:flex;align-items:center;justify-content:center;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)">${icon}</div>`
}

function markerHTML(state: MState, rating?: number): string {
  if (isNativeRuntime()) return nativeMarkerHTML(state)
  const isSelected = state === 'selected'
  const isHover = state === 'hover'
  const isFav = state === 'favorite'

  // Brandbook sizes
  const size = isSelected ? 36 : isHover ? 34 : 28
  const height = isSelected ? 48 : isHover ? 45 : 38

  // Brandbook colors per state
  let bodyFill: string, bodyStroke: string, bodyStrokeW: string
  if (isSelected) {
    bodyFill = 'white'
    bodyStroke = 'var(--ink)'
    bodyStrokeW = '2'
  } else if (isFav) {
    bodyFill = mapAccent()
    bodyStroke = 'none'
    bodyStrokeW = '0' // ember (signature)
  } else {
    bodyFill = mapInk()
    bodyStroke = 'none'
    bodyStrokeW = '0' // ink
  }

  const shadow = isSelected
    ? 'filter:drop-shadow(0 4px 14px rgba(14,14,13,0.28))'
    : isHover
      ? 'filter:drop-shadow(0 3px 8px rgba(14,14,13,0.20))'
      : 'filter:drop-shadow(0 2px 5px rgba(14,14,13,0.14))'

  // Inner circle
  let inner = ''
  if (isSelected) {
    // Brandbook: cercle ink + point blanc au centre
    const cy = Math.round(size * 0.44)
    inner =
      `<circle cx="${size / 2}" cy="${cy}" r="${Math.round(size * 0.28)}" fill="${mapInk()}"/>` +
      `<circle cx="${size / 2}" cy="${cy}" r="${Math.round(size * 0.1)}" fill="white"/>`
  } else if (rating != null) {
    // Avec note — cercle blanc + texte
    const cy = Math.round(size * 0.44)
    const r = Math.round(size * 0.3)
    inner =
      `<circle cx="${size / 2}" cy="${cy}" r="${r}" fill="white" opacity=".95"/>` +
      `<text x="${size / 2}" y="${cy + 4}" text-anchor="middle" font-size="9" font-weight="700" fill="${mapInk()}" font-family="Inter,system-ui">${rating.toFixed(1)}</text>`
  } else if (isFav) {
    // Favori — cercle blanc + coeur SVG
    const cy = Math.round(size * 0.44)
    const r = Math.round(size * 0.3)
    const hs = Math.round(size * 0.32)
    inner =
      `<circle cx="${size / 2}" cy="${cy}" r="${r}" fill="white" opacity=".95"/>` +
      `<path transform="translate(${size / 2 - hs / 2} ${cy - hs / 2}) scale(${hs / 24})" fill="${mapAccent()}" d="M12 21s-7-5.7-7-11a5 5 0 019-3 5 5 0 019 3c0 5.3-7 11-7 11z"/>`
  } else {
    // Default — cercle blanc
    const cy = Math.round(size * 0.44)
    const r = Math.round(size * 0.18)
    inner = `<circle cx="${size / 2}" cy="${cy}" r="${r}" fill="white" opacity=".9"/>`
  }

  // Brandbook teardrop path (scaled to viewBox size×height)
  // Brandbook SVG: viewBox 0 0 28 38, path "M14 36C14 36 2 24 2 14a12 12 0 0124 0C26 24 14 36 14 36z"
  const cx = size / 2
  const tip = height - 2
  const bodyR = Math.round(size * 0.43) // ~12/28 * size
  const topY = height - size * 0.86 // circle center

  // Pulse ring for selected (behind the marker)
  const ring = isSelected
    ? `<div style="position:absolute;inset:-10px;border-radius:50%;border:2.5px solid ${mapPulseRing()};animation:pulse-ring 1.8s ease-out infinite;pointer-events:none;bottom:auto;top:5px;left:-3px;right:-3px;height:${size + 6}px"></div>`
    : ''

  return `
    <div style="position:relative;width:${size}px;height:${height}px;display:flex;flex-direction:column;align-items:center">
      ${ring}
      <svg width="${size}" height="${height}" viewBox="0 0 ${size} ${height}" fill="none" style="${shadow};display:block;overflow:visible">
        <path d="M${cx} ${tip}C${cx} ${tip} ${cx - bodyR + 2} ${topY + bodyR * 1.05} ${cx - bodyR + 2} ${topY}a${bodyR - 2} ${bodyR - 2} 0 01${(bodyR - 2) * 2} 0C${cx + bodyR} ${topY + bodyR * 1.05} ${cx} ${tip} ${cx} ${tip}z"
          fill="${bodyFill}" ${bodyStrokeW !== '0' ? `stroke="${bodyStroke}" stroke-width="${bodyStrokeW}"` : ''}/>
        ${inner}
      </svg>
    </div>`
}

// ── Marker state / signature helpers (perf) ───────────────
// A marker is only re-iconned when its signature changes, so the
// enrichment stream / hover / select never recreate every icon.
function markerState(
  id: string,
  selectedId: string | undefined,
  hoveredId: string | null | undefined,
  isFav: boolean
): MState {
  if (id === selectedId) return 'selected'
  if (id === hoveredId) return 'hover'
  return isFav ? 'favorite' : 'default'
}

function markerSig(state: MState, rating: number | undefined, isFav: boolean): string {
  return `${state}|${rating ?? ''}|${isFav ? 1 : 0}`
}

function iconDims(state: MState): [number, number] {
  if (isNativeRuntime()) {
    const d = state === 'selected' ? 44 : state === 'hover' ? 40 : 34
    return [d, d]
  }
  if (state === 'selected') return [36, 48]
  if (state === 'hover') return [34, 45]
  return [28, 38]
}

function makeDivIcon(L: A, state: MState, rating?: number): A {
  const [sz, sh] = iconDims(state)
  return L.divIcon({
    className: '',
    html: markerHTML(state, rating),
    iconSize: [sz, sh],
    // natif : marqueur rond → ancre au centre ; web : teardrop → ancre en pointe basse
    iconAnchor: isNativeRuntime() ? [sz / 2, sh / 2] : [sz / 2, sh],
  })
}

// ── Cluster bubble — monochrome (papier + anneau noir, chiffre serif) ──
function clusterIconHTML(count: number): string {
  const s = count < 10 ? 38 : count < 100 ? 44 : 50
  const fs = count < 100 ? 14 : 13
  const bg = 'rgba(255,255,255,0.97)'
  const ring = '#0a0a0a'
  const numFont = "'Playfair Display',Georgia,serif"
  const ink = '#111112'
  return `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${bg};border:2px solid ${ring};box-shadow:0 3px 12px rgba(20,22,43,0.20);display:flex;align-items:center;justify-content:center;font-family:${numFont};font-weight:700;font-size:${fs}px;color:${ink}">${count}</div>`
}

// ── User location dot ──────────────────────────────────────
function userDotHTML(): string {
  return `
    <div style="position:relative;width:18px;height:18px">
      <div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(10,10,10,0.12);animation:pulse-ring 2.4s ease-out infinite"></div>
      <div style="width:18px;height:18px;border-radius:50%;background:#0a0a0a;border:2.5px solid white;box-shadow:0 2px 8px rgba(10,10,10,0.35)"></div>
    </div>`
}

// ── Departure dot (start of route) ────────────────────────
function startDotHTML(): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:20px;height:20px;border-radius:50%;background:${mapAccent()};border:2.5px solid white;box-shadow:0 2px 8px rgba(20,22,43,0.4);display:flex;align-items:center;justify-content:center">
        <div style="width:7px;height:7px;border-radius:50%;background:white"></div>
      </div>
      <div style="background:rgba(10,10,10,0.88);color:white;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;white-space:nowrap;letter-spacing:0.03em">Départ</div>
    </div>`
}

const MapView = forwardRef<MapViewHandle, Props>(function MapView(
  {
    places,
    selectedId,
    hoveredId,
    userLocation,
    onMoveEnd,
    onMarkerClick,
    onMarkerHover,
    onPinDrop,
    showSearchHere,
    onSearchHere,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<A>(null)
  // value: { marker, sig } — sig lets us skip unchanged icon rebuilds
  const markersRef = useRef<Map<string, A>>(new Map())
  const clusterRef = useRef<A>(null)
  const placesMapRef = useRef<Map<string, PlaceCard>>(new Map())
  const selIdRef = useRef<string | undefined>(undefined)
  const hovIdRef = useRef<string | null | undefined>(undefined)
  const prevSelectedRef = useRef<string | undefined>(undefined)
  const prevHoveredRef = useRef<string | null | undefined>(undefined)
  const userMarkerRef = useRef<A>(null)
  const startMarkerRef = useRef<A>(null)
  const routeLayerRef = useRef<A>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyRef = useRef(false)
  const pinModeRef = useRef(false)
  const lastBboxRef = useRef<BBox | null>(null)

  const cbMove = useRef(onMoveEnd)
  const cbClick = useRef(onMarkerClick)
  const cbHover = useRef(onMarkerHover)
  const cbPin = useRef(onPinDrop)
  cbMove.current = onMoveEnd
  cbClick.current = onMarkerClick
  cbHover.current = onMarkerHover
  cbPin.current = onPinDrop

  // Keep latest selection / place data readable from stable closures
  selIdRef.current = selectedId
  hovIdRef.current = hoveredId
  placesMapRef.current = new Map(places.map((p) => [p.osm_id, p]))

  useImperativeHandle(ref, () => ({
    flyTo(lat, lon, zoom = 15) {
      mapRef.current?.flyTo([lat, lon], zoom, { animate: true, duration: 0.7 })
    },
    flyToUser(lat, lon, zoom = 15) {
      // The Leaflet map loads asynchronously (CDN), so a fast GPS fix can arrive
      // before it exists. Retry until the map is laid out, then fly.
      let tries = 0
      const go = () => {
        const map = mapRef.current
        const size = map?.getSize?.()
        if (!map || !size || size.y === 0) {
          if (tries++ < 30) setTimeout(go, 150)
          return
        }
        // On mobile the bottom sheet covers the lower half, so a dead-center fly
        // hides the user dot. Shift the target down (south) in projected space so
        // the point renders ~24% above center, in the visible strip.
        if (size.x < 700) {
          const p = map.project([lat, lon], zoom).add([0, size.y * 0.24])
          map.flyTo(map.unproject(p, zoom), zoom, { animate: true, duration: 0.7 })
        } else {
          map.flyTo([lat, lon], zoom, { animate: true, duration: 0.7 })
        }
      }
      go()
    },
    fitBounds(points) {
      const L: A = (window as A).L
      const map = mapRef.current
      if (!L || !map || points.length === 0) return
      if (points.length === 1) {
        map.flyTo(points[0], 15, { animate: true, duration: 0.7 })
        return
      }
      map.flyToBounds(L.latLngBounds(points), { padding: [64, 64], maxZoom: 16, duration: 0.7 })
    },
    drawRoute(coords, color = mapAccent()) {
      const L: A = (window as A).L
      const map = mapRef.current
      if (!L || !map) return
      if (routeLayerRef.current) map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = L.polyline(coords, {
        color,
        weight: 4.5,
        opacity: 0.82,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)
      if (startMarkerRef.current) map.removeLayer(startMarkerRef.current)
      if (coords.length > 0) {
        startMarkerRef.current = L.marker(coords[0], {
          icon: L.divIcon({
            className: '',
            html: startDotHTML(),
            iconSize: [20, 36],
            iconAnchor: [10, 36],
          }),
          zIndexOffset: 2500,
        }).addTo(map)
      }
    },
    clearRoute() {
      const map = mapRef.current
      if (!map) return
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current)
        routeLayerRef.current = null
      }
      if (startMarkerRef.current) {
        map.removeLayer(startMarkerRef.current)
        startMarkerRef.current = null
      }
    },
    enablePinDrop() {
      pinModeRef.current = true
      if (mapRef.current) mapRef.current.getContainer().style.cursor = 'crosshair'
    },
    disablePinDrop() {
      pinModeRef.current = false
      if (mapRef.current) mapRef.current.getContainer().style.cursor = ''
    },
    getBounds() {
      return lastBboxRef.current
    },
  }))

  // ── Init ───────────────────────────────────────────────
  useEffect(() => {
    if (readyRef.current) return
    readyRef.current = true
    const markers = markersRef.current

    ;(async () => {
      await loadAsset('link', 'lf-css', {
        rel: 'stylesheet',
        href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      })
      await loadAsset('script', 'lf-js', {
        src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        crossorigin: '',
      })
      // Marker clustering (declutters + lifts the 200-pin cap, much faster).
      // The plugin reads the `L` global at parse time, so it must not be requested
      // until Leaflet has actually published it.
      if ((window as A).L) {
        await loadAsset('link', 'mc-css', {
          rel: 'stylesheet',
          href: 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
        })
        await loadAsset('script', 'mc-js', {
          src: 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
        })
      }

      const L: A = (window as A).L
      if (!L || !containerRef.current) return
      if ((containerRef.current as A)._leaflet_id) delete (containerRef.current as A)._leaflet_id

      const map = L.map(containerRef.current, {
        center: [48.8566, 2.3522],
        zoom: 15,
        zoomControl: false,
        preferCanvas: false,
        // Attribution retirée de la carte → relayée par le lien "Attribution"
        // des footers (conformité ODbL/CARTO conservée, page /attribution).
        attributionControl: false,
      })

      // Positron (light_all): minimal light-grey basemap so the black pins and
      // gold star read as the only colour — matches the Monochrome Premium look.
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">les contributeurs d’OpenStreetMap</a> | <a href="/attribution">Attribution des données</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      mapRef.current = map

      // Cluster group — brand-styled bubbles, declusters when zoomed in.
      clusterRef.current = L.markerClusterGroup
        ? L.markerClusterGroup({
            maxClusterRadius: 48,
            disableClusteringAtZoom: 17,
            showCoverageOnHover: false,
            spiderfyOnMaxZoom: true,
            chunkedLoading: true,
            removeOutsideVisibleBounds: true,
            iconCreateFunction: (cluster: A) => {
              const n = cluster.getChildCount()
              const s = n < 10 ? 38 : n < 100 ? 44 : 50
              return L.divIcon({ html: clusterIconHTML(n), className: '', iconSize: [s, s] })
            },
          })
        : L.layerGroup()
      map.addLayer(clusterRef.current)

      const fire = () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          const b = map.getBounds(),
            c = map.getCenter()
          const bbox = {
            minLon: b.getWest(),
            minLat: b.getSouth(),
            maxLon: b.getEast(),
            maxLat: b.getNorth(),
            centerLat: c.lat,
            centerLon: c.lng,
          }
          lastBboxRef.current = bbox
          cbMove.current(bbox)
        }, 500)
      }

      map.on('click', (e: A) => {
        if (!pinModeRef.current) return
        cbPin.current?.(e.latlng.lat, e.latlng.lng)
        pinModeRef.current = false
        map.getContainer().style.cursor = ''
      })

      map.on('moveend', fire)
      map.on('zoomend', fire)
      setTimeout(() => {
        map.invalidateSize()
        fire()
      }, 250)
    })()

    return () => {
      readyRef.current = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
      mapRef.current?.remove()
      mapRef.current = null
      markers.clear()
    }
  }, [])

  // ── User location dot ──────────────────────────────────
  useEffect(() => {
    if (!userLocation) return
    let cancelled = false
    let tries = 0
    // The map loads asynchronously; if the location arrives first, retry until
    // it's ready so the dot is never silently dropped.
    const place = () => {
      if (cancelled) return
      const L: A = (window as A).L
      const map = mapRef.current
      if (!L || !map) {
        if (tries++ < 30) setTimeout(place, 150)
        return
      }
      userMarkerRef.current?.remove()
      userMarkerRef.current = L.marker(userLocation, {
        icon: L.divIcon({
          className: '',
          html: userDotHTML(),
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
        zIndexOffset: 3000,
      }).addTo(map)
    }
    place()
    return () => {
      cancelled = true
    }
  }, [userLocation])

  // ── Sync restaurant markers (clustered, signature-diffed) ──
  // Adds new pins in bulk, removes stale ones, and re-icons ONLY the
  // markers whose signature (state|rating|fav) actually changed — so the
  // 3-layer enrichment stream never recreates the whole marker set.
  useEffect(() => {
    const L: A = (window as A).L
    const cluster = clusterRef.current
    if (!L || !cluster) return
    const store = markersRef.current
    const ids = new Set(places.map((p) => p.osm_id))

    // Remove markers for places no longer present
    for (const [id, entry] of store) {
      if (!ids.has(id)) {
        cluster.removeLayer(entry.marker)
        store.delete(id)
      }
    }

    const toAdd: A[] = []
    for (const place of places) {
      // Skip entries without a usable id or coordinates: a NaN/undefined
      // L.marker throws and would abort the rest of the loop (dropping pins).
      if (!place.osm_id || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) continue
      const isFav = !!place.is_favorite
      const state = markerState(place.osm_id, selIdRef.current, hovIdRef.current, isFav)
      const rating = place.fsq?.rating ?? undefined
      const sig = markerSig(state, rating, isFav)
      const existing = store.get(place.osm_id)

      if (!existing) {
        const id = place.osm_id
        // Leaflet innerHTMLs a string tooltip. Place names come from OpenStreetMap,
        // which anyone can edit, so a name like `<img src=x onerror=…>` would run.
        // An element is inserted as a node — textContent can't become markup.
        const tip = document.createElement('span')
        tip.textContent = place.name
        const marker = L.marker([place.lat, place.lon], { icon: makeDivIcon(L, state, rating) })
          .bindTooltip(tip, {
            direction: 'top',
            offset: [0, -34],
            opacity: 1,
            className: '',
          })
          .on('click', () => {
            lightTap()
            cbClick.current(placesMapRef.current.get(id) ?? place)
          })
          .on('mouseover', () => cbHover.current(id))
          .on('mouseout', () => cbHover.current(null))
        store.set(id, { marker, sig })
        toAdd.push(marker)
      } else if (existing.sig !== sig) {
        existing.marker.setIcon(makeDivIcon(L, state, rating))
        existing.sig = sig
      }
    }

    if (toAdd.length) {
      if (cluster.addLayers) cluster.addLayers(toAdd)
      else toAdd.forEach((m) => cluster.addLayer(m))
    }
  }, [places])

  // ── Update icon state on select / hover (only affected pins) ──
  useEffect(() => {
    const L: A = (window as A).L
    if (!L) return
    const store = markersRef.current
    const affected = new Set<string>()
    for (const id of [prevSelectedRef.current, selectedId, prevHoveredRef.current, hoveredId]) {
      if (id) affected.add(id)
    }
    for (const id of affected) {
      const entry = store.get(id)
      const place = placesMapRef.current.get(id)
      if (!entry || !place) continue
      const isFav = !!place.is_favorite
      const state = markerState(id, selectedId, hoveredId, isFav)
      const rating = place.fsq?.rating ?? undefined
      const sig = markerSig(state, rating, isFav)
      if (entry.sig !== sig) {
        entry.marker.setIcon(makeDivIcon(L, state, rating))
        entry.sig = sig
      }
      entry.marker.setZIndexOffset(state === 'selected' ? 2000 : state === 'hover' ? 1000 : 0)
    }
    prevSelectedRef.current = selectedId
    prevHoveredRef.current = hoveredId
  }, [selectedId, hoveredId])

  // ── Pan to selected ───────────────────────────────────
  useEffect(() => {
    if (!selectedId || !mapRef.current) return
    const p = places.find((place) => place.osm_id === selectedId)
    if (p) mapRef.current.panTo([p.lat, p.lon], { animate: true, duration: 0.3 })
  }, [selectedId, places])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* "Search this area" pill */}
      {showSearchHere && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(var(--safe-top) + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 400,
            animation: 'fadeDown 200ms var(--ease-out) both',
          }}
        >
          <button
            onClick={onSearchHere}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 'var(--r-pill)',
              background: 'var(--white)',
              border: '1.5px solid var(--b2)',
              boxShadow: 'var(--s3)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--ink)',
              cursor: 'pointer',
              transition: 'all 120ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            <IcoSearch />
            Search this area
          </button>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(to right, rgba(250,249,247,0.05) 0%, transparent 36px)',
        }}
      />
    </div>
  )
})

export default MapView
