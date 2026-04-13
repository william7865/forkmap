// ============================================================
// page.tsx — Refonte UX complète "Carte Blanche"
// Architecture : Header minimal · Sidebar 380px · Map pleine
// UX : Filtres en drawer · Detail overlay flottant · Collapse sidebar
// ============================================================
"use client";

import dynamic from "next/dynamic";
import { useHomeState } from "@/lib/hooks/useHomeState";
import SuggestionsPanel from "@/components/place/SuggestionsPanel";
import LanguagePicker from "@/components/ui/LanguagePicker";
import PlaceList from "@/components/place/PlaceList";
import PlaceCardSkeleton from "@/components/place/PlaceCardSkeleton";
import StartPanel from "@/components/location/StartPanel";
import ToastStack from "@/components/ui/ToastStack";
import BottomSheet from "@/components/ui/BottomSheet";
import { ErrorBoundary } from "@/components/states/ErrorBoundary";

const MapView       = dynamic(() => import("@/components/map/MapView"),          { ssr: false });
const PlaceDetail   = dynamic(() => import("@/components/place/PlaceDetail"),    { ssr: false });
const FiltersPanel  = dynamic(() => import("@/components/filters/FiltersPanel"), { ssr: false });
const ShareModal    = dynamic(() => import("@/components/place/ShareModal"),     { ssr: false });
const AuthModal     = dynamic(() => import("@/components/ui/AuthModal"),         { ssr: false });

import { IcoSearch, IcoX, IcoSliders, IcoMapPin, IcoChevLeft, IcoChevRight } from "@/components/icons";

// ── Enrichment bar ─────────────────────────────────────────
function EnrichBar({ active }: { active: boolean }) {
  return (
    <div style={{ position:"absolute",bottom:0,left:0,right:0,height:2,background:"transparent",overflow:"hidden",opacity:active?1:0,transition:"opacity 400ms ease" }}>
      <div style={{ position:"absolute",top:0,left:0,width:"50%",height:"100%",background:"linear-gradient(90deg,transparent,var(--forest-mid),transparent)",animation:active?"enrichSweep 1.4s ease-in-out infinite":"none" }}/>
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
  const {
    auth, toast, isMobile, tr,
    filteredPlaces, loading, enriching, error, places, fetchRestaurants,
    favoriteIds, routeLoading, routeResult,
    selectedPlace, hoveredId, setHoveredId, filters, setFilters, nameQuery, setNameQuery,
    showFilters, setShowFilters, showAuthModal, setShowAuthModal, showSearchHere,
    pinDropActive, routeMode, userLocation, locationLabel, locating, locateError,
    sidebarCollapsed, setSidebarCollapsed, sharePlace, setSharePlace,
    searchFocused, setSearchFocused, recentSearches, setRecentSearches,
    activeCount, visiblePlaces, topCuisines, nearbyPlaces, mapRef,
    handleFilters, handleCuisineFilter, saveSearch,
    handleLocationChange, locate, togglePinDrop, handlePinDrop,
    handleMoveEnd, doSearchHere, handleMarkerClick, handleTransportChange,
    handleCloseDetail, handleToggleFavorite,
  } = useHomeState();

  return (
    <div className="page-shell" style={{
      display:"flex", flexDirection:"column",
      background:"var(--off-white)",
      fontFamily:"var(--font-body)",
    }}>

      {/* ══════════ HEADER ══════════ */}
      <header style={{
        height:56, flexShrink:0,
        display:"flex", alignItems:"center",
        padding:"0 16px", gap:10,
        background:"var(--white)",
        borderBottom:"1px solid var(--ink-10)",
        zIndex:1000, position:"relative",
      }}>

        {/* Search — filtre résultats visibles */}
        <div style={{ flex:1, maxWidth:520, position:"relative" }}>
          <label htmlFor="sidebar-search" style={{ position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0,0,0,0)",whiteSpace:"nowrap" }}>
            Rechercher un restaurant
          </label>
          <span style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"var(--ink-40)",pointerEvents:"none",display:"flex" }}>
            <IcoSearch />
          </span>
          <input
            id="sidebar-search"
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
            onFocus={e=>{ e.currentTarget.style.borderColor="var(--forest-mid)"; e.currentTarget.style.background="white"; e.currentTarget.style.boxShadow="var(--s-focus)"; setSearchFocused(true); }}
            onBlur={e=>{ e.currentTarget.style.borderColor="var(--ink-10)"; e.currentTarget.style.background="var(--off-white)"; e.currentTarget.style.boxShadow="none"; setTimeout(() => setSearchFocused(false), 150); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nameQuery.trim()) {
                saveSearch(nameQuery.trim());
                setSearchFocused(false);
              }
            }}
          />
          {nameQuery && (
            <button onClick={()=>setNameQuery("")} aria-label="Effacer la recherche" style={{ position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--ink-40)",display:"flex",padding:2 }}>
              <IcoX />
            </button>
          )}
          {searchFocused && (nameQuery.length > 0 || recentSearches.length > 0) && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
              background: "var(--white)", border: "1px solid var(--ink-10)",
              borderRadius: "var(--r-md)", boxShadow: "var(--s2)", zIndex: 500,
              overflow: "hidden",
            }}>
              {/* Suggestions from places */}
              {nameQuery.length > 1 && places
                .filter(p =>
                  p.name.toLowerCase().includes(nameQuery.toLowerCase()) ||
                  (p.cuisine ?? "").toLowerCase().includes(nameQuery.toLowerCase())
                )
                .slice(0, 5)
                .map(p => (
                  <button
                    key={p.osm_id}
                    onMouseDown={() => {
                      setNameQuery(p.name);
                      saveSearch(p.name);
                      setSearchFocused(false);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "9px 12px",
                      background: "none", border: "none", cursor: "pointer",
                      textAlign: "left", fontFamily: "var(--font-body)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--off-white)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
                    {p.cuisine && (
                      <span style={{ fontSize: 11, color: "var(--ink-40)" }}>{p.cuisine}</span>
                    )}
                  </button>
                ))
              }

              {/* Recent searches */}
              {nameQuery.length === 0 && recentSearches.length > 0 && (
                <>
                  <div style={{
                    padding: "6px 12px 2px",
                    fontSize: 10, fontWeight: 700, color: "var(--ink-40)", letterSpacing: "0.08em",
                  }}>RÉCENTS</div>
                  {recentSearches.map(s => (
                    <div key={s} style={{ display: "flex", alignItems: "center", padding: "8px 12px", gap: 8 }}>
                      <button
                        onMouseDown={() => { setNameQuery(s); setSearchFocused(false); }}
                        style={{
                          flex: 1, background: "none", border: "none", cursor: "pointer",
                          textAlign: "left", fontSize: 13, color: "var(--ink-80)",
                          fontFamily: "var(--font-body)",
                        }}
                      >🕐 {s}</button>
                      <button
                        onMouseDown={() => setRecentSearches(prev => {
                          const n = prev.filter(r => r !== s);
                          localStorage.setItem("forkmap_recent_searches", JSON.stringify(n));
                          return n;
                        })}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--ink-40)", fontSize: 16, padding: 0,
                        }}
                      >×</button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ flex:1 }}/>

        {/* Loading subtle */}
        {loading && !enriching && (
          <div style={{ display:"flex",alignItems:"center",gap:5,color:"var(--ink-40)",fontSize:11,fontWeight:500,flexShrink:0 }}>
            <div style={{ width:11,height:11,border:"1.5px solid var(--ink-10)",borderTop:"1.5px solid var(--forest-mid)",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
            Chargement
          </div>
        )}

        {/* Filtres */}
        <button onClick={()=>setShowFilters(v=>!v)} aria-expanded={showFilters} aria-controls="filters-panel" style={{
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

        <LanguagePicker />

        <EnrichBar active={enriching} />
      </header>

      {/* ── Filters drawer pleine largeur ── */}
      <div id="filters-panel" style={{
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

              {/* Quick filter chips */}
              {(() => {
                type ChipDef = { id: string; label: string; active: boolean; onToggle: () => void };
                const chips: ChipDef[] = [
                  {
                    id: "open", label: "Ouvert maintenant",
                    active: !!filters.openNow,
                    onToggle: () => setFilters(f => ({ ...f, openNow: !f.openNow })),
                  },
                  {
                    id: "rating4", label: "⭐ 4+",
                    active: (filters.minRating ?? 0) >= 8,
                    onToggle: () => setFilters(f => ({ ...f, minRating: (f.minRating ?? 0) >= 8 ? 0 : 8 })),
                  },
                  ...topCuisines.map(c => ({
                    id: `cuisine-${c}`, label: c,
                    active: filters.cuisine === c,
                    onToggle: () => setFilters(f => ({ ...f, cuisine: f.cuisine === c ? "" : c })),
                  })),
                ];

                return (
                  <div style={{
                    display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4,
                    scrollbarWidth: "none", marginBottom: 4, marginTop: 8,
                  }}>
                    {chips.map(chip => (
                      <button key={chip.id} onClick={chip.onToggle} aria-pressed={chip.active} style={{
                        flexShrink: 0, padding: "4px 10px",
                        borderRadius: "var(--r-pill)",
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                        border: `1px solid ${chip.active ? "var(--forest-mid)" : "var(--ink-10)"}`,
                        background: chip.active ? "var(--forest-mid)" : "var(--off-white)",
                        color: chip.active ? "white" : "var(--ink-60)",
                        fontFamily: "var(--font-body)",
                        transition: "all 120ms",
                        whiteSpace: "nowrap",
                      }}>{chip.label}</button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Skeletons */}
            {loading && places.length === 0 && (
              <div style={{ padding: "0 8px" }}>
                {[1,2,3,4].map(i => <PlaceCardSkeleton key={i} />)}
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
                onCuisineFilter={handleCuisineFilter}
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
            onCuisineFilter={handleCuisineFilter}
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
