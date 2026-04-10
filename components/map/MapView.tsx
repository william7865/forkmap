"use client";
import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import type { PlaceCard } from "@/types";

export interface MapViewHandle {
  flyTo: (lat: number, lon: number, zoom?: number) => void;
  drawRoute: (coords: [number,number][], color?: string) => void;
  clearRoute: () => void;
  enablePinDrop: () => void;
  disablePinDrop: () => void;
  getBounds: () => { minLon:number; minLat:number; maxLon:number; maxLat:number; centerLat:number; centerLon:number } | null;
}

interface BBox { minLon:number; minLat:number; maxLon:number; maxLat:number; centerLat:number; centerLon:number; }
interface Props {
  places: PlaceCard[];
  selectedId?: string;
  hoveredId?: string | null;
  userLocation?: [number,number] | null;
  onMoveEnd: (b: BBox) => void;
  onMarkerClick: (p: PlaceCard) => void;
  onMarkerHover: (id: string | null) => void;
  onPinDrop?: (lat: number, lon: number) => void;
  showSearchHere?: boolean;
  onSearchHere?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type A = any;

function loadAsset(tag:"script"|"link", id:string, attrs:Record<string,string>): Promise<void> {
  return new Promise(res => {
    if (document.getElementById(id)) { res(); return; }
    const el = document.createElement(tag);
    el.id = id;
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
    el.onload = () => res(); el.onerror = () => res();
    document.head.appendChild(el);
  });
}

type MState = "default" | "hover" | "selected" | "favorite";

// ── Marqueurs — design exact du brandbook ─────────────────
// Default: teardrop ink + cercle blanc
// Avec note: teardrop ink + cercle blanc + texte note
// Favori: teardrop forest-mid + cercle blanc + ♥
// Sélectionné: teardrop blanc + bordure ink + cercle ink + point blanc
// Inactif: teardrop bone/stone + cercle stone
function markerHTML(state: MState, rating?: number): string {
  const isSelected = state === "selected";
  const isHover    = state === "hover";
  const isFav      = state === "favorite";

  // Brandbook sizes
  const size   = isSelected ? 36 : isHover ? 34 : 28;
  const height = isSelected ? 48 : isHover ? 45 : 38;

  // Brandbook colors per state
  let bodyFill: string, bodyStroke: string, bodyStrokeW: string;
  if (isSelected) {
    bodyFill = "white"; bodyStroke = "var(--ink)"; bodyStrokeW = "2";
  } else if (isFav) {
    bodyFill = "#2d7a55"; bodyStroke = "none"; bodyStrokeW = "0"; // forest-mid
  } else {
    bodyFill = "#0e0e0d"; bodyStroke = "none"; bodyStrokeW = "0"; // ink
  }

  const shadow = isSelected
    ? "filter:drop-shadow(0 4px 14px rgba(14,14,13,0.28))"
    : isHover
    ? "filter:drop-shadow(0 3px 8px rgba(14,14,13,0.20))"
    : "filter:drop-shadow(0 2px 5px rgba(14,14,13,0.14))";

  // Inner circle
  let inner = "";
  if (isSelected) {
    // Brandbook: cercle ink + point blanc au centre
    const cy = Math.round(size * 0.44);
    inner = `<circle cx="${size/2}" cy="${cy}" r="${Math.round(size*0.28)}" fill="#0e0e0d"/>`
          + `<circle cx="${size/2}" cy="${cy}" r="${Math.round(size*0.10)}" fill="white"/>`;
  } else if (rating != null) {
    // Avec note — cercle blanc + texte
    const cy = Math.round(size * 0.44);
    const r = Math.round(size * 0.30);
    inner = `<circle cx="${size/2}" cy="${cy}" r="${r}" fill="white" opacity=".95"/>`
          + `<text x="${size/2}" y="${cy+4}" text-anchor="middle" font-size="9" font-weight="700" fill="#0e0e0d" font-family="Geist,system-ui">${rating.toFixed(1)}</text>`;
  } else if (isFav) {
    // Favori — cercle blanc + ♥
    const cy = Math.round(size * 0.44);
    const r = Math.round(size * 0.30);
    inner = `<circle cx="${size/2}" cy="${cy}" r="${r}" fill="white" opacity=".95"/>`
          + `<text x="${size/2}" y="${cy+5}" text-anchor="middle" font-size="11" fill="#2d7a55" font-family="Georgia,serif">♥</text>`;
  } else {
    // Default — cercle blanc
    const cy = Math.round(size * 0.44);
    const r = Math.round(size * 0.18);
    inner = `<circle cx="${size/2}" cy="${cy}" r="${r}" fill="white" opacity=".9"/>`;
  }

  // Brandbook teardrop path (scaled to viewBox size×height)
  // Brandbook SVG: viewBox 0 0 28 38, path "M14 36C14 36 2 24 2 14a12 12 0 0124 0C26 24 14 36 14 36z"
  const cx = size / 2;
  const tip = height - 2;
  const bodyR = Math.round(size * 0.43); // ~12/28 * size
  const topY = height - size * 0.86; // circle center

  // Pulse ring for selected (behind the marker)
  const ring = isSelected
    ? `<div style="position:absolute;inset:-10px;border-radius:50%;border:2.5px solid rgba(45,122,85,0.32);animation:pulse-ring 1.8s ease-out infinite;pointer-events:none;bottom:auto;top:5px;left:-3px;right:-3px;height:${size+6}px"></div>`
    : "";

  return `
    <div style="position:relative;width:${size}px;height:${height}px;display:flex;flex-direction:column;align-items:center">
      ${ring}
      <svg width="${size}" height="${height}" viewBox="0 0 ${size} ${height}" fill="none" style="${shadow};display:block;overflow:visible">
        <path d="M${cx} ${tip}C${cx} ${tip} ${cx-bodyR+2} ${topY+bodyR*1.05} ${cx-bodyR+2} ${topY}a${bodyR-2} ${bodyR-2} 0 01${(bodyR-2)*2} 0C${cx+bodyR} ${topY+bodyR*1.05} ${cx} ${tip} ${cx} ${tip}z"
          fill="${bodyFill}" ${bodyStrokeW !== "0" ? `stroke="${bodyStroke}" stroke-width="${bodyStrokeW}"` : ""}/>
        ${inner}
      </svg>
    </div>`;
}

// ── User location dot ──────────────────────────────────────
function userDotHTML(): string {
  return `
    <div style="position:relative;width:18px;height:18px">
      <div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(29,101,200,0.15);animation:pulse-ring 2.4s ease-out infinite"></div>
      <div style="width:18px;height:18px;border-radius:50%;background:#1d65c8;border:2.5px solid white;box-shadow:0 2px 8px rgba(29,101,200,0.4)"></div>
    </div>`;
}

// ── Departure dot (start of route) ────────────────────────
function startDotHTML(): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:20px;height:20px;border-radius:50%;background:#16a34a;border:2.5px solid white;box-shadow:0 2px 8px rgba(22,163,74,0.4);display:flex;align-items:center;justify-content:center">
        <div style="width:7px;height:7px;border-radius:50%;background:white"></div>
      </div>
      <div style="background:rgba(22,100,74,0.88);color:white;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;white-space:nowrap;letter-spacing:0.03em">Start</div>
    </div>`;
}

const MapView = forwardRef<MapViewHandle, Props>(function MapView(
  { places, selectedId, hoveredId, userLocation, onMoveEnd, onMarkerClick, onMarkerHover,
    onPinDrop, showSearchHere, onSearchHere }, ref
) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<A>(null);
  const markersRef    = useRef<Map<string,A>>(new Map());
  const userMarkerRef = useRef<A>(null);
  const startMarkerRef= useRef<A>(null);
  const routeLayerRef = useRef<A>(null);
  const debounceRef   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const readyRef      = useRef(false);
  const pinModeRef    = useRef(false);
  const lastBboxRef   = useRef<BBox|null>(null);

  const cbMove  = useRef(onMoveEnd);
  const cbClick = useRef(onMarkerClick);
  const cbHover = useRef(onMarkerHover);
  const cbPin   = useRef(onPinDrop);
  cbMove.current  = onMoveEnd;
  cbClick.current = onMarkerClick;
  cbHover.current = onMarkerHover;
  cbPin.current   = onPinDrop;

  useImperativeHandle(ref, () => ({
    flyTo(lat, lon, zoom=15) {
      mapRef.current?.flyTo([lat, lon], zoom, { animate:true, duration:0.7 });
    },
    drawRoute(coords, color="#2d7a55") {
      const L: A = (window as A).L; const map = mapRef.current;
      if (!L || !map) return;
      if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = L.polyline(coords, {
        color, weight:4.5, opacity:0.82, lineCap:"round", lineJoin:"round",
      }).addTo(map);
      if (startMarkerRef.current) map.removeLayer(startMarkerRef.current);
      if (coords.length > 0) {
        startMarkerRef.current = L.marker(coords[0], {
          icon: L.divIcon({ className:"", html:startDotHTML(), iconSize:[20,36], iconAnchor:[10,36] }),
          zIndexOffset:2500,
        }).addTo(map);
      }
    },
    clearRoute() {
      const map = mapRef.current; if (!map) return;
      if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
      if (startMarkerRef.current) { map.removeLayer(startMarkerRef.current); startMarkerRef.current = null; }
    },
    enablePinDrop() {
      pinModeRef.current = true;
      if (mapRef.current) mapRef.current.getContainer().style.cursor = "crosshair";
    },
    disablePinDrop() {
      pinModeRef.current = false;
      if (mapRef.current) mapRef.current.getContainer().style.cursor = "";
    },
    getBounds() { return lastBboxRef.current; },
  }));

  // ── Init ───────────────────────────────────────────────
  useEffect(() => {
    if (readyRef.current) return;
    readyRef.current = true;

    (async () => {
      await loadAsset("link","lf-css",{ rel:"stylesheet", href:"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" });
      await loadAsset("script","lf-js",{ src:"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", crossorigin:"" });

      const L: A = (window as A).L;
      if (!L || !containerRef.current) return;
      if ((containerRef.current as A)._leaflet_id) delete (containerRef.current as A)._leaflet_id;

      const map = L.map(containerRef.current, {
        center:[48.8566,2.3522], zoom:15,
        zoomControl:false, preferCanvas:false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a> | <a href="/attribution">Data attribution</a>',
        subdomains:"abcd", maxZoom:20,
      }).addTo(map);

      L.control.zoom({ position:"bottomright" }).addTo(map);
      mapRef.current = map;

      const fire = () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          const b = map.getBounds(), c = map.getCenter();
          const bbox = { minLon:b.getWest(),minLat:b.getSouth(),maxLon:b.getEast(),maxLat:b.getNorth(),centerLat:c.lat,centerLon:c.lng };
          lastBboxRef.current = bbox;
          cbMove.current(bbox);
        }, 500);
      };

      map.on("click", (e: A) => {
        if (!pinModeRef.current) return;
        cbPin.current?.(e.latlng.lat, e.latlng.lng);
        pinModeRef.current = false;
        map.getContainer().style.cursor = "";
      });

      map.on("moveend", fire);
      map.on("zoomend", fire);
      setTimeout(() => { map.invalidateSize(); fire(); }, 250);
    })();

    return () => {
      readyRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      mapRef.current?.remove(); mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // ── User location dot ──────────────────────────────────
  useEffect(() => {
    const L: A = (window as A).L; const map = mapRef.current;
    if (!L || !map || !userLocation) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = L.marker(userLocation, {
      icon: L.divIcon({ className:"", html:userDotHTML(), iconSize:[18,18], iconAnchor:[9,9] }),
      zIndexOffset:3000,
    }).addTo(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  // ── Sync restaurant markers ────────────────────────────
  useEffect(() => {
    const L: A = (window as A).L; const map = mapRef.current;
    if (!L || !map) return;
    const ex = markersRef.current;
    const ids = new Set(places.map(p => p.osm_id));
    for (const [id, m] of ex) { if (!ids.has(id)) { m.remove(); ex.delete(id); } }

    for (const place of places.filter(p => !ex.has(p.osm_id)).slice(0, 200)) {
      const st: MState = place.is_favorite ? "favorite" : "default";
      const rating = place.fsq?.rating ?? undefined;
      const sz = 28; const sh = 38;
      const marker = L.marker([place.lat, place.lon], {
        icon: L.divIcon({ className:"", html:markerHTML(st, rating), iconSize:[sz,sh], iconAnchor:[sz/2,sh] }),
      }).addTo(map)
        .bindTooltip(place.name, {
          direction:"top", offset:[0,-sz-6], opacity:1, className:"",
        })
        .on("click",     () => cbClick.current(place))
        .on("mouseover", () => cbHover.current(place.osm_id))
        .on("mouseout",  () => cbHover.current(null));
      ex.set(place.osm_id, marker);
    }
  }, [places]);

  // ── Update icon states on select / hover ───────────────
  useEffect(() => {
    const L: A = (window as A).L; if (!L) return;
    for (const [id, marker] of markersRef.current) {
      const place = places.find(p => p.osm_id === id); if (!place) continue;
      const st: MState = id===selectedId?"selected":id===hoveredId?"hover":place.is_favorite?"favorite":"default";
      const rating = place.fsq?.rating ?? undefined;
      const sz = st==="selected"?36:st==="hover"?34:28;
      const sh = st==="selected"?48:st==="hover"?45:38;
      marker.setIcon(L.divIcon({ className:"", html:markerHTML(st, rating), iconSize:[sz,sh], iconAnchor:[sz/2,sh] }));
      marker.setZIndexOffset(st==="selected"?2000:st==="hover"?1000:0);
    }
  }, [selectedId, hoveredId, places]);

  // ── Pan to selected ───────────────────────────────────
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const p = places.find(p => p.osm_id === selectedId);
    if (p) mapRef.current.panTo([p.lat, p.lon], { animate:true, duration:0.3 });
  }, [selectedId, places]);

  return (
    <div style={{ position:"relative", width:"100%", height:"100%" }}>
      <div ref={containerRef} style={{ width:"100%", height:"100%" }}/>

      {/* "Search this area" pill */}
      {showSearchHere && (
        <div style={{ position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",zIndex:400,animation:"fadeDown 200ms var(--ease-out) both" }}>
          <button onClick={onSearchHere} style={{
            display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
            borderRadius:"var(--r-pill)", background:"var(--white)",
            border:"1.5px solid var(--b2)", boxShadow:"var(--s3)",
            fontSize:12, fontWeight:700, color:"var(--ink)", cursor:"pointer",
            transition:"all 120ms ease", whiteSpace:"nowrap",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Search this area
          </button>
        </div>
      )}

      <div style={{ position:"absolute",inset:0,pointerEvents:"none",background:"linear-gradient(to right, rgba(250,249,247,0.05) 0%, transparent 36px)" }}/>
    </div>
  );
});

export default MapView;
