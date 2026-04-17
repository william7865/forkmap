// ============================================================
// page.tsx — Refonte UX complète "Carte Blanche"
// Architecture : Header minimal · Sidebar 380px · Map pleine
// UX : Filtres en drawer · Detail overlay flottant · Collapse sidebar
// ============================================================
"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { PlaceCard, FilterState } from "@/types";
import { useRestaurants } from "@/lib/hooks/useRestaurants";
import { useRouteCache, type TransportMode } from "@/lib/hooks/useRouteCache";
import { useAuth } from "@/lib/hooks/useAuth";
import { useToast } from "@/lib/hooks/useToast";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import FiltersPanel from "@/components/filters/FiltersPanel";
import ShareModal from "@/components/place/ShareModal";
import SuggestionsPanel from "@/components/place/SuggestionsPanel";
import LanguagePicker from "@/components/ui/LanguagePicker";
import { useLanguage } from "@/lib/i18n/useLanguage";
import PlaceList from "@/components/place/PlaceList";
import PlaceDetail from "@/components/place/PlaceDetail";
import StartPanel from "@/components/location/StartPanel";
import ToastStack from "@/components/ui/ToastStack";
import AuthButton from "@/components/ui/AuthButton";
import AuthModal from "@/components/ui/AuthModal";
import BottomSheet from "@/components/ui/BottomSheet";
import { ErrorBoundary } from "@/components/states/ErrorBoundary";
import type { MapViewHandle } from "@/components/map/MapView";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

// ── Icons brandbook stroke 1.7 ─────────────────────────────
const IcoSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const IcoX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
const IcoSliders = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="8" y1="12" x2="20" y2="12"/>
    <line x1="4" y1="18" x2="20" y2="18"/>
  </svg>
);
const IcoBookmark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
  </svg>
);
const IcoMapPin = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IcoChevLeft = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IcoChevRight = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

// ── Enrichment bar ─────────────────────────────────────────
function EnrichBar({ active }: { active: boolean }) {
  return (
    <div style={{ position:"absolute",bottom:0,left:0,right:0,height:2,background:"transparent",overflow:"hidden",opacity:active?1:0,transition:"opacity 400ms ease" }}>
      <div style={{ position:"absolute",top:0,left:"-50%",width:"50%",height:"100%",background:"linear-gradient(90deg,transparent,var(--forest-mid),transparent)",animation:active?"enrichSweep 1.4s ease-in-out infinite":"none" }}/>
    </div>
  );
}

// ── Map loading overlay ────────────────────────────────────
function MapLoadingOverlay({ loading, routeLoading }: { loading:boolean; routeLoading:boolean }) {
  if (!loading && !routeLoading) return null;
  return (
    <div style={{
      position:"absolute", top:12, left:"50%", transform:"translateX(-50%)",
      background:"rgba(255,255,255,0.96)", backdropFilter:"blur(12px)",
      borderRadius:"var(--r-pill)", padding:"7px 16px",
      display:"flex", alignItems:"center", gap:8,
      boxShadow:"var(--s3)", border:"1px solid var(--ink-10)",
      fontSize:12, fontWeight:500, color:"var(--ink-60)",
      animation:"fadeUp 200ms var(--ease-out) both",
      zIndex:500, pointerEvents:"none", whiteSpace:"nowrap",
    }}>
      <div style={{ width:12,height:12,border:"1.5px solid var(--ink-10)",borderTop:"1.5px solid var(--forest-mid)",borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0 }}/>
      {routeLoading ? "Calcul itinéraire…" : "Chargement…"}
    </div>
  );
}

export default function HomePage() {
  const auth     = useAuth();
  const toast    = useToast();
  const isMobile = useIsMobile();
  const { tr }   = useLanguage();

  const {
    filteredPlaces, loading, enriching, error,
    places, fetchRestaurants, applyClientFilters,
    toggleFavorite, favoriteIds,
  } = useRestaurants();

  const [selectedPlace,    setSelectedPlace]    = useState<PlaceCard|null>(null);
  const [hoveredId,        setHoveredId]        = useState<string|null>(null);
  const [filters,          setFilters]          = useState<FilterState>({ sortBy:"score" });
  const [nameQuery,        setNameQuery]        = useState("");
  const [showFilters,      setShowFilters]      = useState(false);
  const [showAuthModal,    setShowAuthModal]    = useState(false);
  const [showSearchHere,   setShowSearchHere]   = useState(false);
  const [lastSearchBbox,   setLastSearchBbox]   = useState<string|null>(null);
  const [pinDropActive,    setPinDropActive]    = useState(false);
  const [routeMode,        setRouteMode]        = useState<TransportMode>("foot");
  const [userLocation,     setUserLocation]     = useState<[number,number]|null>(null);
  const [locationLabel,    setLocationLabel]    = useState<string|null>(null);
  const [locating,         setLocating]         = useState(false);
  const [locateError,      setLocateError]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sharePlace,      setSharePlace]      = useState<PlaceCard|null>(null);

  const currentBboxRef = useRef<string>("");
  const mapRef         = useRef<MapViewHandle>(null);

  const { getRoute, loading: routeLoading, clearCache: clearRouteCache } = useRouteCache();
  const [routeResult, setRouteResult] = useState<{ duration:number; distance:number; coords:[number,number][] }|null>(null);

  // ── Filters ───────────────────────────────────────────────
  const activeCount = Object.keys(filters).filter(k => k !== "sortBy" && filters[k as keyof FilterState] != null).length;

  const handleFilters = useCallback((f: FilterState) => {
    setFilters(f);
    applyClientFilters(f);
  }, [applyClientFilters]);

  // ── Name filter ───────────────────────────────────────────
  const visiblePlaces = useMemo(() =>
    nameQuery.trim()
      ? filteredPlaces.filter(p =>
          p.name.toLowerCase().includes(nameQuery.toLowerCase()) ||
          p.cuisine?.toLowerCase().includes(nameQuery.toLowerCase())
        )
      : filteredPlaces,
    [filteredPlaces, nameQuery]
  );

  // ── Location ──────────────────────────────────────────────
  const handleLocationChange = useCallback((lat: number, lon: number, label: string) => {
    setUserLocation([lat, lon]);
    setLocationLabel(label);
    mapRef.current?.flyTo(lat, lon, 15);
  }, []);

  const locate = useCallback(async () => {
    setLocating(true); setLocateError(false);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setUserLocation([lat, lon]); setLocationLabel(null);
        mapRef.current?.flyTo(lat, lon, 15);
        setLocating(false);
      },
      () => { setLocateError(true); setLocating(false); }
    );
  }, []);

  // ── Pin drop ──────────────────────────────────────────────
  const togglePinDrop = useCallback(() => {
    const next = !pinDropActive;
    setPinDropActive(next);
    if (next) mapRef.current?.enablePinDrop();
    else mapRef.current?.disablePinDrop();
  }, [pinDropActive]);

  const handlePinDrop = useCallback((lat: number, lon: number) => {
    setUserLocation([lat, lon]);
    setLocationLabel("Point sélectionné");
    setPinDropActive(false);
    mapRef.current?.disablePinDrop();
  }, []);

  // ── Map move ──────────────────────────────────────────────
  const handleMoveEnd = useCallback((bbox: Parameters<typeof fetchRestaurants>[0]) => {
    const key = `${bbox.minLon.toFixed(3)},${bbox.minLat.toFixed(3)},${bbox.maxLon.toFixed(3)},${bbox.maxLat.toFixed(3)}`;
    currentBboxRef.current = key;
    if (lastSearchBbox && key !== lastSearchBbox) setShowSearchHere(true);
    else { setLastSearchBbox(key); fetchRestaurants(bbox); }
  }, [lastSearchBbox, fetchRestaurants]);

  const doSearchHere = useCallback(() => {
    setShowSearchHere(false); setLastSearchBbox(currentBboxRef.current);
    const bounds = mapRef.current?.getBounds();
    if (bounds) fetchRestaurants(bounds);
  }, [fetchRestaurants]);

  // ── Routing ───────────────────────────────────────────────
  const doRoute = useCallback(async (place: PlaceCard, mode: TransportMode) => {
    if (!userLocation) return;
    mapRef.current?.clearRoute();
    const result = await getRoute(userLocation, [place.lat, place.lon], mode);
    setRouteResult(result ?? null);
    if (result) mapRef.current?.drawRoute(result.coords);
    else toast.error("Impossible de calculer l'itinéraire.");
  }, [userLocation, getRoute, toast]);

  const handleMarkerClick = useCallback((place: PlaceCard) => {
    setSelectedPlace(place);
    if (userLocation) doRoute(place, routeMode);
    if (!isMobile) setTimeout(() => mapRef.current?.flyTo(place.lat, place.lon, 15), 100);
  }, [userLocation, routeMode, doRoute, isMobile]);

  // Restaurants proches du lieu sélectionné (même cuisine ou à <500m, max 3)
  const nearbyPlaces = useMemo(() => {
    if (!selectedPlace) return [];
    // Use ALL places (not just viewport-filtered) so nearby works even when neighbours
    // are outside the current map bounds.
    return places
      .filter(p => p.osm_id !== selectedPlace.osm_id)
      .filter(p => {
        // Compute distance to selectedPlace if not pre-computed
        const selLat = selectedPlace.lat;
        const selLon = selectedPlace.lon;
        const pLat = p.lat;
        const pLon = p.lon;
        const dx = (pLon - selLon) * Math.cos((selLat * Math.PI) / 180) * 111320;
        const dy = (pLat - selLat) * 111320;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const close = dist < 600;
        const sameCuisine = !!(p.cuisine && selectedPlace.cuisine &&
          p.cuisine.toLowerCase() === selectedPlace.cuisine.toLowerCase());
        return close || sameCuisine;
      })
      .map(p => {
        const selLat = selectedPlace.lat;
        const selLon = selectedPlace.lon;
        const dx = (p.lon - selLon) * Math.cos((selLat * Math.PI) / 180) * 111320;
        const dy = (p.lat - selLat) * 111320;
        const dist = Math.round(Math.sqrt(dx*dx + dy*dy));
        return { ...p, distance: dist };
      })
      .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999))
      .slice(0, 4);
  }, [selectedPlace, places]);

  const handleTransportChange = useCallback((mode: TransportMode) => {
    setRouteMode(mode);
    if (selectedPlace && userLocation) doRoute(selectedPlace, mode);
  }, [selectedPlace, userLocation, doRoute]);

  const handleCloseDetail = useCallback(() => {
    setSelectedPlace(null);
    setRouteResult(null);
    mapRef.current?.clearRoute();
  }, []);

  const handleToggleFavorite = useCallback(async (place: PlaceCard) => {
    const isCurrentlyFav = favoriteIds.has(place.osm_id);
    // Optimistic: flip heart immediately in detail panel
    setSelectedPlace(prev =>
      prev?.osm_id === place.osm_id ? { ...prev, is_favorite: !isCurrentlyFav } : prev
    );
    const result = await toggleFavorite(place);
    if (result === "auth_required") {
      setSelectedPlace(prev =>
        prev?.osm_id === place.osm_id ? { ...prev, is_favorite: isCurrentlyFav } : prev
      );
      setShowAuthModal(true);
      toast.info("Connectez-vous pour sauvegarder vos favoris");
      return;
    }
    if (result === "error") {
      setSelectedPlace(prev =>
        prev?.osm_id === place.osm_id ? { ...prev, is_favorite: isCurrentlyFav } : prev
      );
      toast.error("Impossible de mettre à jour les favoris.");
      return;
    }
    toast[isCurrentlyFav ? "info" : "success"](
      isCurrentlyFav ? `"${place.name}" retiré des favoris` : `"${place.name}" sauvegardé ✓`
    );
  }, [toggleFavorite, favoriteIds, toast]);

  return (
    <div style={{
      position:"fixed", inset:0,
      display:"flex", flexDirection:"column",
      background:"var(--off-white)",
      fontFamily:"var(--font-body)",
    }}>

      {/* ══════════ HEADER ══════════ */}
      <header style={{
        height:56, flexShrink:0,
        display:"flex", alignItems:"center",
        padding:"0 20px", gap:10,
        background:"var(--white)",
        borderBottom:"1px solid var(--ink-10)",
        zIndex:1000, position:"relative",
      }}>

        {/* Logo */}
        <Link href="/" style={{ display:"flex",alignItems:"center",gap:9,textDecoration:"none",flexShrink:0 }}>
          <div style={{ width:30,height:30,borderRadius:8,background:"var(--ink)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 4v8c0 2.5 1 4 3 4.5V21M15 4v5c0 1-.7 1.5-1.5 1.5S12 10 12 9V4M15 9.5c0 2 1.5 3 3 3V21"
                stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          {!isMobile && (
            <span style={{ fontFamily:"var(--font-display)",fontWeight:400,fontSize:20,letterSpacing:"-0.04em",color:"var(--ink)",lineHeight:1 }}>
              fork<em style={{ fontStyle:"italic",color:"var(--forest-mid)" }}>map</em>
            </span>
          )}
        </Link>

        {/* Séparateur — desktop only */}
        {!isMobile && <div style={{ width:1,height:22,background:"var(--ink-10)",flexShrink:0,margin:"0 2px" }}/>}

        {/* Search — desktop only */}
        {!isMobile && (
          <div style={{ flex:1, maxWidth:420, position:"relative" }}>
            <span style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"var(--ink-40)",pointerEvents:"none",display:"flex" }}>
              <IcoSearch />
            </span>
            <input
              type="text"
              placeholder={tr("search_placeholder")}
              value={nameQuery}
              onChange={e => setNameQuery(e.target.value)}
              style={{
                width:"100%", padding:"8px 32px 8px 34px",
                borderRadius:"var(--r-md)", border:"1px solid var(--ink-10)",
                background:"var(--off-white)", color:"var(--ink)",
                fontSize:13, fontWeight:400, outline:"none", fontFamily:"inherit",
                transition:"all 120ms ease",
              }}
              onFocus={e=>{ e.currentTarget.style.borderColor="var(--forest-mid)"; e.currentTarget.style.background="white"; e.currentTarget.style.boxShadow="var(--s-focus)"; }}
              onBlur={e=>{ e.currentTarget.style.borderColor="var(--ink-10)"; e.currentTarget.style.background="var(--off-white)"; e.currentTarget.style.boxShadow="none"; }}
            />
            {nameQuery && (
              <button onClick={()=>setNameQuery("")} style={{ position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--ink-40)",display:"flex",padding:2 }}>
                <IcoX />
              </button>
            )}
          </div>
        )}

        <div style={{ flex:1 }}/>

        {/* Loading subtle — desktop only */}
        {!isMobile && loading && !enriching && (
          <div style={{ display:"flex",alignItems:"center",gap:5,color:"var(--ink-40)",fontSize:11,fontWeight:500,flexShrink:0 }}>
            <div style={{ width:11,height:11,border:"1.5px solid var(--ink-10)",borderTop:"1.5px solid var(--forest-mid)",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
            Chargement
          </div>
        )}

        {/* Filtres — desktop only */}
        {!isMobile && (
          <button onClick={()=>setShowFilters(v=>!v)} style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"7px 13px", borderRadius:"var(--r-md)", cursor:"pointer",
            fontSize:12, fontWeight:500, fontFamily:"var(--font-body)",
            background: showFilters ? "var(--forest-mid)" : "var(--off-white)",
            border:`1px solid ${showFilters ? "var(--forest-mid)" : "var(--ink-10)"}`,
            color: showFilters ? "white" : "var(--ink-60)",
            transition:"all 150ms var(--ease-out)", flexShrink:0,
          }}>
            <IcoSliders />
            {tr("filters")}
            {activeCount > 0 && (
              <span style={{
                minWidth:16, height:16, borderRadius:"var(--r-pill)",
                background: showFilters ? "rgba(255,255,255,0.3)" : "var(--forest-mid)",
                color:"white", fontSize:9, fontWeight:700,
                display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px",
              }}>
                {activeCount}
              </span>
            )}
          </button>
        )}

        {/* Favoris — desktop only */}
        {!isMobile && (
          <a href="/favorites" style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"7px 13px", borderRadius:"var(--r-md)",
            textDecoration:"none", fontSize:12, fontWeight:500,
            background:"var(--off-white)", color:"var(--ink-60)",
            border:"1px solid var(--ink-10)", flexShrink:0,
            transition:"all 120ms ease",
          }}
            onMouseEnter={e=>{ e.currentTarget.style.background="var(--cream)"; e.currentTarget.style.color="var(--ink)"; e.currentTarget.style.borderColor="var(--ink-20)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="var(--off-white)"; e.currentTarget.style.color="var(--ink-60)"; e.currentTarget.style.borderColor="var(--ink-10)"; }}
          >
            <IcoBookmark />
            {tr("favorites")}
          </a>
        )}

        <AuthButton auth={auth} onOpenModal={() => setShowAuthModal(true)} />
        {!isMobile && <LanguagePicker />}

        <EnrichBar active={enriching} />
      </header>

      {/* ── Filters drawer pleine largeur ── */}
      <div style={{
        maxHeight: showFilters ? 68 : 0,
        overflow:"hidden",
        transition:"max-height 280ms var(--ease-out)",
        flexShrink:0,
        background:"var(--white)",
        borderBottom: showFilters ? "1px solid var(--ink-10)" : "none",
        zIndex:900,
      }}>
        <div style={{ padding:"0 20px" }}>
          <FiltersPanel filters={filters} onChange={handleFilters} places={filteredPlaces} horizontal />
        </div>
      </div>

      {/* ══════════ BODY ══════════ */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>

        {/* ═══ SIDEBAR — flex normal, width animée ═══ */}
        {!isMobile && (
          <div style={{
            width: sidebarCollapsed ? 0 : 380,
            minWidth: sidebarCollapsed ? 0 : 380,
            flexShrink: 0,
            display:"flex", flexDirection:"column",
            background:"var(--white)",
            borderRight: sidebarCollapsed ? "none" : "1px solid var(--ink-10)",
            overflow:"hidden",
            transition:"width 280ms var(--ease-out), min-width 280ms var(--ease-out)",
            zIndex:10,
          }}>

            {/* Sidebar header : point de départ + stats */}
            <div style={{
              padding:"14px 16px 12px",
              borderBottom:"1px solid var(--ink-10)",
              flexShrink:0,
            }}>
              <StartPanel
                userLocation={userLocation}
                locationLabel={locationLabel}
                onLocationChange={handleLocationChange}
                onLocateMe={locate}
                locating={locating}
                locateError={locateError}
              />

              {/* Stats + pin start */}
              <div style={{
                display:"flex", alignItems:"center", gap:8,
                marginTop:10, paddingTop:10,
                borderTop:"1px solid var(--ink-10)",
              }}>
                <span style={{
                  fontSize:10, fontWeight:600,
                  color:"var(--forest-mid)",
                  letterSpacing:"0.14em", textTransform:"uppercase",
                  display:"flex", alignItems:"center", gap:7,
                }}>
                  <span style={{ display:"block",width:12,height:1.5,background:"var(--forest-mid)" }}/>
                  {loading ? tr("loading") : `${visiblePlaces.length} ${visiblePlaces.length !== 1 ? tr("places") : tr("place")}`}
                </span>
                <div style={{ flex:1 }}/>
                {/* Pin start */}
                <button onClick={togglePinDrop} title="Définir un point de départ" style={{
                  display:"flex", alignItems:"center", gap:5,
                  padding:"5px 10px", borderRadius:"var(--r-md)", cursor:"pointer",
                  fontSize:11, fontWeight:500, fontFamily:"var(--font-body)",
                  background: pinDropActive ? "var(--forest-pale)" : "transparent",
                  border:`1px solid ${pinDropActive ? "rgba(45,122,85,0.4)" : "var(--ink-10)"}`,
                  color: pinDropActive ? "var(--forest)" : "var(--ink-60)",
                  transition:"all 150ms ease",
                }}>
                  <IcoMapPin />
                  {pinDropActive ? tr("clicking") : tr("departure_point")}
                </button>
              </div>
            </div>

            {/* Skeletons */}
            {loading && filteredPlaces.length === 0 && (
              <div style={{ padding:"12px 12px 0", flexShrink:0 }}>
                {[1,2].map(i=>(
                  <div key={i} style={{ borderRadius:"var(--r-xl)",overflow:"hidden",marginBottom:12,border:"1px solid var(--ink-10)" }}>
                    <div className="skeleton" style={{ height:148,width:"100%" }}/>
                    <div style={{ padding:"14px 16px 0" }}>
                      <div className="skeleton" style={{ height:16,width:"65%",borderRadius:6,marginBottom:8 }}/>
                      <div className="skeleton" style={{ height:10,width:"40%",borderRadius:5 }}/>
                    </div>
                    <div style={{ padding:"10px 16px 14px",marginTop:12,borderTop:"1px solid var(--ink-10)",display:"flex",justifyContent:"space-between" }}>
                      <div className="skeleton" style={{ height:10,width:40,borderRadius:5 }}/>
                      <div className="skeleton" style={{ width:30,height:30,borderRadius:"var(--r-sm)" }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions — visible quand on a des favoris et des restaurants chargés */}
            {favoriteIds.size > 0 && visiblePlaces.length > 0 && !loading && (
              <SuggestionsPanel
                places={visiblePlaces}
                favoriteIds={favoriteIds}
                onSelect={handleMarkerClick}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {/* Liste */}
            <div style={{ flex:1, overflow:"hidden" }}>
              <PlaceList
                places={visiblePlaces}
                selectedId={selectedPlace?.osm_id}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onSelect={handleMarkerClick}
                onToggleFavorite={handleToggleFavorite}
                loading={loading}
                error={error}
                nameQuery={nameQuery}
                hasActiveFilters={activeCount > 0}
                onRetry={() => { const b = mapRef.current?.getBounds(); if (b) fetchRestaurants(b); }}
                onResetFilters={() => handleFilters({ sortBy:"score" })}
                onShare={setSharePlace}
              />
            </div>
          </div>
        )}

        {/* ── Bouton collapse — EN DEHORS des deux divs, position absolute dans le body ──
            Le body a position:relative + overflow:hidden, donc le bouton reste visible
            mais ne crée pas de scrollbar. On le place à la jointure sidebar/carte. */}
        {!isMobile && (
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            title={sidebarCollapsed ? "Afficher la liste" : "Masquer la liste"}
            style={{
              position:"absolute",
              /* quand sidebar ouverte : left = 380 - 14 (moitié du bouton dépasse sur la carte)
                 quand fermée : left = 0 (bouton colle au bord gauche de la carte) */
              left: sidebarCollapsed ? 0 : 380 - 14,
              top:"50%", transform:"translateY(-50%)",
              width:28, height:56,
              borderRadius: sidebarCollapsed ? "0 var(--r-md) var(--r-md) 0" : "0 var(--r-md) var(--r-md) 0",
              background:"var(--white)",
              border:"1px solid var(--ink-10)",
              borderLeft:"none",
              boxShadow:"3px 0 10px rgba(14,14,13,0.12)",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer",
              /* zIndex 1000 : au-dessus de Leaflet (400+) et de tout overlay */
              zIndex:1000,
              color:"var(--ink-40)",
              transition:"left 280ms var(--ease-out), background 150ms ease, color 150ms ease, border-color 150ms ease",
              flexShrink:0,
              pointerEvents:"all",
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.background="var(--forest-pale)";
              e.currentTarget.style.color="var(--forest-mid)";
              e.currentTarget.style.borderColor="rgba(45,122,85,0.3)";
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.background="var(--white)";
              e.currentTarget.style.color="var(--ink-40)";
              e.currentTarget.style.borderColor="var(--ink-10)";
            }}
          >
            {sidebarCollapsed ? <IcoChevRight /> : <IcoChevLeft />}
          </button>
        )}

        {/* ═══ MAP ═══ */}
        <div style={{ flex:1, position:"relative", overflow:"hidden" }}>

          <ErrorBoundary
            fallback={
              <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14,background:"var(--white)",padding:24 }}>
                <div style={{ width:52,height:52,borderRadius:16,background:"var(--forest-pale)",border:"1px solid rgba(45,122,85,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 }}>🗺️</div>
                <p style={{ margin:"0 0 6px",fontSize:14,fontWeight:600,color:"var(--ink)" }}>Carte indisponible</p>
                <button onClick={()=>window.location.reload()} style={{ padding:"10px 22px",borderRadius:"var(--r-md)",border:"none",background:"var(--forest-mid)",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-body)" }}>
                  Recharger
                </button>
              </div>
            }
          >
            <MapView
              ref={mapRef}
              places={filteredPlaces}
              selectedId={selectedPlace?.osm_id}
              hoveredId={hoveredId}
              userLocation={userLocation}
              onMoveEnd={handleMoveEnd}
              onMarkerClick={handleMarkerClick}
              onMarkerHover={setHoveredId}
              onPinDrop={handlePinDrop}
              showSearchHere={showSearchHere}
              onSearchHere={doSearchHere}
            />
          </ErrorBoundary>

          <MapLoadingOverlay loading={loading} routeLoading={routeLoading} />

          {/* Pin drop banner */}
          {pinDropActive && (
            <div style={{
              position:"absolute", bottom:24, left:"50%", transform:"translateX(-50%)",
              background:"var(--ink)", color:"white",
              borderRadius:"var(--r-pill)", padding:"10px 20px",
              display:"flex", alignItems:"center", gap:10,
              fontSize:12, fontWeight:500, boxShadow:"var(--s4)",
              animation:"fadeUp 180ms var(--ease-out) both",
              zIndex:500, whiteSpace:"nowrap",
            }}>
              <IcoMapPin />
              Cliquez sur la carte pour définir votre départ
              <button onClick={togglePinDrop} style={{
                background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)",
                color:"white", cursor:"pointer", fontWeight:600,
                padding:"3px 10px", borderRadius:"var(--r-pill)",
                fontSize:11, fontFamily:"inherit",
              }}>Annuler</button>
            </div>
          )}

          {/* Detail overlay — flottant sur la carte */}
          {selectedPlace && (
            <div style={{
              position:"absolute", right:16, top:16, bottom:16,
              width:304, zIndex:600,
              animation:"slideInRight 260ms var(--ease-out) both",
              display:"flex", flexDirection:"column",
            }}>
              <PlaceDetail
                place={selectedPlace}
                onClose={handleCloseDetail}
                onToggleFavorite={handleToggleFavorite}
                nearbyPlaces={nearbyPlaces}
                onSelectPlace={handleMarkerClick}
                routeResult={routeResult ?? null}
                routeLoading={routeLoading}
                routeMode={routeMode}
                hasUserLocation={!!userLocation}
                onTransportChange={handleTransportChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* ══════════ MOBILE ══════════ */}
      {isMobile && (
        <BottomSheet
          title="Restaurants"
          subtitle={loading ? "Chargement…" : `${visiblePlaces.length} trouvés`}
          defaultSnap="half"
          bottomOffset={80}
        >
          <StartPanel
            userLocation={userLocation}
            locationLabel={locationLabel}
            onLocationChange={handleLocationChange}
            onLocateMe={locate}
            locating={locating}
            locateError={locateError}
          />
          <PlaceList
            places={visiblePlaces}
            selectedId={selectedPlace?.osm_id}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onSelect={handleMarkerClick}
            onToggleFavorite={handleToggleFavorite}
            loading={loading}
            error={error}
            nameQuery={nameQuery}
            hasActiveFilters={activeCount > 0}
            onRetry={() => { const b = mapRef.current?.getBounds(); if (b) fetchRestaurants(b); }}
            onShare={setSharePlace}
          />
        </BottomSheet>
      )}

      {isMobile && selectedPlace && (
        <div style={{ position:"fixed",inset:"auto 0 0 0",zIndex:900,animation:"slideUp 260ms var(--ease-out) both" }}>
          <PlaceDetail
            place={selectedPlace}
            onClose={handleCloseDetail}
            onToggleFavorite={handleToggleFavorite}
            nearbyPlaces={nearbyPlaces}
            onSelectPlace={handleMarkerClick}
            routeResult={routeResult ?? null}
            routeLoading={routeLoading}
            routeMode={routeMode}
            hasUserLocation={!!userLocation}
            onTransportChange={handleTransportChange}
          />
        </div>
      )}

      {showAuthModal && (
        <AuthModal
          auth={auth}
          onClose={() => setShowAuthModal(false)}
          onSuccess={msg => toast.success(msg)}
          onError={msg => toast.error(msg)}
        />
      )}

      {/* ── Share modal — rendu au niveau root pour éviter clipping ── */}
      {sharePlace && (
        <ShareModal
          place={sharePlace}
          onClose={() => setSharePlace(null)}
        />
      )}

      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes enrichSweep { 0%{left:-50%} 100%{left:100%} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .anim-slide-right { animation: slideInRight 300ms cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
    </div>
  );
}
