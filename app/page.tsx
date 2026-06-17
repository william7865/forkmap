'use client'

import dynamic from 'next/dynamic'
import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useHomeState, UNLISTED } from '@/lib/hooks/useHomeState'
import SuggestionsPanel from '@/components/place/SuggestionsPanel'
import PlaceList from '@/components/place/PlaceList'
import PlaceCardSkeleton from '@/components/place/PlaceCardSkeleton'
import StartPanel from '@/components/location/StartPanel'
import ToastStack from '@/components/ui/ToastStack'
import BottomSheet from '@/components/ui/BottomSheet'
import { ErrorBoundary } from '@/components/states/ErrorBoundary'
import {
  Search,
  X,
  SlidersHorizontal,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Sparkles,
  Bookmark,
} from 'lucide-react'

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false })
const PlaceDetail = dynamic(() => import('@/components/place/PlaceDetail'), { ssr: false })
const FiltersPanel = dynamic(() => import('@/components/filters/FiltersPanel'), { ssr: false })
const ShareModal = dynamic(() => import('@/components/place/ShareModal'), { ssr: false })
const AuthModal = dynamic(() => import('@/components/ui/AuthModal'), { ssr: false })
const SurpriseSheet = dynamic(() => import('@/components/place/SurpriseSheet'), { ssr: false })

function AuthRequiredWatcher({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  useEffect(() => {
    if (searchParams.get('auth') !== 'required') return
    onOpen()
    // Clear the `auth` param so clicking "Se connecter" again re-opens the
    // modal (without this, the URL stays at ?auth=required and a second
    // click is a no-op → the button appears dead).
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.delete('auth')
    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : '/', { scroll: false })
  }, [searchParams, onOpen, router])
  return null
}

export default function HomePage() {
  const {
    auth,
    toast,
    isMobile,
    tr,
    filteredPlaces,
    mapPlaces,
    loading,
    enriching,
    error,
    places,
    fetchRestaurants,
    favoriteIds,
    savedOnly,
    toggleSavedOnly,
    savedLists,
    activeSavedList,
    selectSavedList,
    routeLoading,
    routeResult,
    selectedPlace,
    hoveredId,
    setHoveredId,
    filters,
    setFilters,
    nameQuery,
    setNameQuery,
    showFilters,
    setShowFilters,
    showSurprise,
    setShowSurprise,
    showAuthModal,
    setShowAuthModal,
    showSearchHere,
    pinDropActive,
    routeMode,
    userLocation,
    locationLabel,
    locating,
    locateError,
    sidebarCollapsed,
    setSidebarCollapsed,
    sharePlace,
    setSharePlace,
    searchFocused,
    setSearchFocused,
    recentSearches,
    setRecentSearches,
    activeCount,
    visiblePlaces,
    topCuisines,
    knownCuisines,
    nearbyPlaces,
    mapRef,
    handleFilters,
    handleCuisineFilter,
    saveSearch,
    handleLocationChange,
    locate,
    togglePinDrop,
    handlePinDrop,
    handleMoveEnd,
    doSearchHere,
    handleMarkerClick,
    handleTransportChange,
    handleCloseDetail,
    handleToggleFavorite,
  } = useHomeState()

  const sidebarW = 380
  const searchLeft = isMobile ? 12 : sidebarCollapsed ? 12 : sidebarW + 12

  // Collection tabs shown in saved mode (Tous + user's lists)
  const savedListTabs =
    savedOnly && savedLists.length > 0 ? (
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 2,
          scrollbarWidth: 'none',
          marginTop: 8,
        }}
      >
        {[
          { id: null as string | null, name: 'Tous' },
          { id: UNLISTED, name: 'Sans liste' },
          ...savedLists,
        ].map((l) => {
          const active = activeSavedList === l.id
          return (
            <button
              key={l.id ?? 'all'}
              onClick={() => selectSavedList(l.id)}
              aria-pressed={active}
              style={{
                flexShrink: 0,
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${active ? 'var(--ember)' : 'var(--border)'}`,
                background: active ? 'var(--ember)' : 'var(--surface)',
                color: active ? '#fff' : 'var(--text-2)',
                fontFamily: 'var(--font-body)',
                transition: 'all 120ms ease',
                whiteSpace: 'nowrap',
              }}
            >
              {l.name}
            </button>
          )
        })}
      </div>
    ) : null

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--surface)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* ═══ MAP — full screen base ═══ */}
      {/* z-index:0 creates a stacking context so Leaflet's internal z-indices (400+) stay contained */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <ErrorBoundary
          fallback={
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 14,
                background: 'var(--bg)',
                padding: 24,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: 'var(--accent-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapPin size={24} strokeWidth={1.75} color="var(--accent)" />
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Carte indisponible
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 22px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Recharger
              </button>
            </div>
          }
        >
          <MapView
            ref={mapRef}
            places={mapPlaces}
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
      </div>

      {/* ═══ FLOATING SEARCH BAR ═══ */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: searchLeft,
          right: selectedPlace && !isMobile ? 332 : 12,
          zIndex: 500,
          transition: 'left 280ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            boxShadow: 'var(--s2)',
            padding: '0 10px 0 0',
          }}
        >
          {/* Search input */}
          <div style={{ flex: 1, position: 'relative' }}>
            <label
              htmlFor="map-search"
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
                whiteSpace: 'nowrap',
              }}
            >
              Rechercher un restaurant
            </label>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-3)',
                pointerEvents: 'none',
                display: 'flex',
              }}
            >
              {loading ? (
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1.5px solid var(--border-strong)',
                    borderTop: '1.5px solid var(--accent)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              ) : (
                <Search size={16} strokeWidth={1.75} />
              )}
            </span>
            <input
              id="map-search"
              type="text"
              placeholder={tr('search_placeholder')}
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 36px 11px 40px',
                borderRadius: '12px 0 0 12px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: 14,
                fontWeight: 400,
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameQuery.trim()) {
                  saveSearch(nameQuery.trim())
                  setSearchFocused(false)
                }
              }}
            />
            {nameQuery && (
              <button
                onClick={() => setNameQuery('')}
                aria-label="Effacer la recherche"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-3)',
                  display: 'flex',
                  padding: 4,
                }}
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

          {/* Filters button */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              background: showFilters ? 'var(--accent-light)' : 'none',
              border: 'none',
              color: showFilters ? 'var(--accent)' : 'var(--text-2)',
              transition: 'all 120ms ease',
              flexShrink: 0,
            }}
          >
            <SlidersHorizontal size={15} strokeWidth={1.75} />
            {!isMobile && tr('filters')}
            {activeCount > 0 && (
              <span
                style={{
                  minWidth: 16,
                  height: 16,
                  borderRadius: 999,
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {activeCount}
              </span>
            )}
          </button>

          {/* Locate button */}
          <button
            onClick={locate}
            title="Me localiser"
            aria-label="Me localiser"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
              borderRadius: 8,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              color: locating ? 'var(--accent)' : 'var(--text-2)',
              flexShrink: 0,
              transition: 'color 120ms ease',
            }}
          >
            <Navigation size={15} strokeWidth={1.75} />
          </button>

          {/* Saved-only toggle */}
          <button
            onClick={toggleSavedOnly}
            title={savedOnly ? 'Voir tous les restaurants' : 'Voir mes enregistrés'}
            aria-label={savedOnly ? 'Voir tous les restaurants' : 'Voir mes enregistrés'}
            aria-pressed={savedOnly}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              background: savedOnly ? 'var(--ember-light)' : 'none',
              border: 'none',
              color: savedOnly ? 'var(--ember-text)' : 'var(--text-2)',
              flexShrink: 0,
              transition: 'all 120ms ease',
            }}
          >
            <Bookmark size={15} strokeWidth={1.75} fill={savedOnly ? 'currentColor' : 'none'} />
            {!isMobile && 'Enregistrés'}
          </button>
        </div>

        {/* Enrichment progress bar */}
        {enriching && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              borderRadius: '0 0 12px 12px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '50%',
                height: '100%',
                background: `linear-gradient(90deg,transparent,var(--accent),transparent)`,
                animation: 'enrichSweep 1.4s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {/* Filters dropdown */}
        {showFilters && (
          <div
            id="filters-panel"
            style={{
              marginTop: 8,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: 'var(--s2)',
              padding: '4px 16px 8px',
              overflow: 'hidden',
            }}
          >
            <FiltersPanel filters={filters} onChange={handleFilters} places={places} horizontal />
          </div>
        )}

        {/* Search suggestions */}
        {searchFocused && (nameQuery.length > 0 || recentSearches.length > 0) && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 8,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: 'var(--s2)',
              zIndex: 600,
              overflow: 'hidden',
            }}
          >
            {nameQuery.length > 1 &&
              places
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes(nameQuery.toLowerCase()) ||
                    (p.cuisine ?? '').toLowerCase().includes(nameQuery.toLowerCase())
                )
                .slice(0, 5)
                .map((p) => (
                  <button
                    key={p.osm_id}
                    onMouseDown={() => {
                      setNameQuery(p.name)
                      saveSearch(p.name)
                      setSearchFocused(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '10px 14px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-body)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <Search size={14} strokeWidth={1.75} color="var(--text-3)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {p.name}
                    </span>
                    {p.cuisine && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.cuisine}</span>
                    )}
                  </button>
                ))}

            {nameQuery.length === 0 && recentSearches.length > 0 && (
              <>
                <div
                  style={{
                    padding: '8px 14px 4px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text-3)',
                    letterSpacing: '0.08em',
                  }}
                >
                  RÉCENTS
                </div>
                {recentSearches.map((s) => (
                  <div
                    key={s}
                    style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', gap: 8 }}
                  >
                    <button
                      onMouseDown={() => {
                        setNameQuery(s)
                        setSearchFocused(false)
                      }}
                      style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 13,
                        color: 'var(--text)',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {s}
                    </button>
                    <button
                      onMouseDown={() =>
                        setRecentSearches((prev) => {
                          const n = prev.filter((r) => r !== s)
                          localStorage.setItem('forkmap_recent_searches', JSON.stringify(n))
                          return n
                        })
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-3)',
                        display: 'flex',
                        padding: 4,
                      }}
                    >
                      <X size={12} strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══ DESKTOP SIDEBAR — floating overlay ═══ */}
      {!isMobile && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: sidebarCollapsed ? -sidebarW : 0,
            bottom: 0,
            width: sidebarW,
            background: 'var(--bg)',
            borderRight: '1px solid var(--border)',
            boxShadow: 'var(--s3)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 300,
            transition: 'left 280ms cubic-bezier(0.16,1,0.3,1)',
            overflow: 'hidden',
          }}
        >
          {/* Sidebar header */}
          <div
            style={{
              padding: '56px 16px 12px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <StartPanel
              userLocation={userLocation}
              locationLabel={locationLabel}
              onLocationChange={handleLocationChange}
              onLocateMe={locate}
              locating={locating}
              locateError={locateError}
            />

            {/* Stats row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 10,
                paddingTop: 10,
                borderTop: '1px solid var(--border)',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-3)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {savedOnly
                  ? `${visiblePlaces.length} enregistré${visiblePlaces.length !== 1 ? 's' : ''}`
                  : loading
                    ? tr('loading')
                    : `${visiblePlaces.length} ${visiblePlaces.length !== 1 ? tr('places') : tr('place')}`}
              </span>
              <div style={{ flex: 1 }} />
              <button
                onClick={togglePinDrop}
                title="Définir un point de départ"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                  background: pinDropActive ? 'var(--accent-light)' : 'transparent',
                  border: `1px solid ${pinDropActive ? 'rgba(45,122,85,0.3)' : 'var(--border)'}`,
                  color: pinDropActive ? 'var(--accent)' : 'var(--text-2)',
                  transition: 'all 150ms ease',
                }}
              >
                <MapPin size={13} strokeWidth={1.75} />
                {pinDropActive ? tr('clicking') : tr('departure_point')}
              </button>
            </div>

            {/* Collection tabs in saved mode, else discovery quick chips */}
            {savedOnly && savedListTabs}
            {!savedOnly &&
              (() => {
                type ChipDef = { id: string; label: string; active: boolean; onToggle: () => void }
                const chips: ChipDef[] = [
                  {
                    id: 'open',
                    label: 'Ouvert',
                    active: !!filters.openNow,
                    onToggle: () => setFilters((f) => ({ ...f, openNow: !f.openNow })),
                  },
                  {
                    id: 'rating4',
                    label: '8+ / 10',
                    active: (filters.minRating ?? 0) >= 8,
                    onToggle: () =>
                      setFilters((f) => ({ ...f, minRating: (f.minRating ?? 0) >= 8 ? 0 : 8 })),
                  },
                  ...topCuisines.map((c) => ({
                    id: `cuisine-${c}`,
                    label: c,
                    active: filters.cuisine === c,
                    onToggle: () =>
                      setFilters((f) => ({ ...f, cuisine: f.cuisine === c ? '' : c })),
                  })),
                ]
                return (
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      overflowX: 'auto',
                      paddingBottom: 2,
                      scrollbarWidth: 'none',
                      marginTop: 8,
                    }}
                  >
                    {chips.map((chip) => (
                      <button
                        key={chip.id}
                        onClick={chip.onToggle}
                        aria-pressed={chip.active}
                        style={{
                          flexShrink: 0,
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: `1px solid ${chip.active ? 'var(--accent)' : 'var(--border)'}`,
                          background: chip.active ? 'var(--accent)' : 'var(--surface)',
                          color: chip.active ? 'white' : 'var(--text-2)',
                          fontFamily: 'var(--font-body)',
                          transition: 'all 120ms ease',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )
              })()}
          </div>

          {/* Skeletons */}
          {loading && places.length === 0 && (
            <div style={{ paddingTop: 8 }}>
              {[1, 2, 3, 4].map((i) => (
                <PlaceCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Suggestions (discovery only — not when browsing saved places) */}
          {!savedOnly && favoriteIds.size > 0 && visiblePlaces.length > 0 && !loading && (
            <SuggestionsPanel
              places={visiblePlaces}
              favoriteIds={favoriteIds}
              onSelect={handleMarkerClick}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {/* List */}
          {/* minHeight:0 lets this flex child shrink below its content so the
              inner PlaceList can actually scroll (default min-height:auto would
              pin it to content height and only the first window would show). */}
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
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
              onRetry={() => {
                const b = mapRef.current?.getBounds()
                if (b) fetchRestaurants(b)
              }}
              onResetFilters={() => handleFilters({ sortBy: 'score' })}
              onShare={setSharePlace}
            />
          </div>
        </div>
      )}

      {/* Sidebar collapse toggle */}
      {!isMobile && (
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={sidebarCollapsed ? 'Afficher la liste' : 'Masquer la liste'}
          style={{
            position: 'absolute',
            left: sidebarCollapsed ? 0 : sidebarW - 14,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 28,
            height: 56,
            borderRadius: '0 10px 10px 0',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderLeft: 'none',
            boxShadow: '3px 0 10px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 400,
            color: 'var(--text-3)',
            transition: 'left 280ms cubic-bezier(0.16,1,0.3,1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-light)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg)'
            e.currentTarget.style.color = 'var(--text-3)'
          }}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={14} strokeWidth={2} />
          ) : (
            <ChevronLeft size={14} strokeWidth={2} />
          )}
        </button>
      )}

      {/* ═══ « Surprends-moi » floating CTA — desktop ═══ */}
      {!isMobile && !selectedPlace && !pinDropActive && (
        <button
          onClick={() => setShowSurprise(true)}
          style={{
            position: 'absolute',
            bottom: 24,
            left: `calc(50% + ${sidebarCollapsed ? 0 : sidebarW / 2}px)`,
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '13px 22px',
            borderRadius: 'var(--r-pill)',
            border: 'none',
            cursor: 'pointer',
            background: 'var(--ember)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            letterSpacing: '-0.01em',
            boxShadow: 'var(--s-ember)',
            zIndex: 450,
            transition:
              'transform 120ms var(--ease-spring), background 140ms ease, left 280ms cubic-bezier(0.16,1,0.3,1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--ember-hover)'
            e.currentTarget.style.transform = 'translateX(-50%) translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--ember)'
            e.currentTarget.style.transform = 'translateX(-50%)'
          }}
        >
          <Sparkles size={17} strokeWidth={2} />
          Surprends-moi
        </button>
      )}

      {/* Pin drop banner */}
      {pinDropActive && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--text)',
            color: 'white',
            borderRadius: 999,
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12,
            fontWeight: 500,
            boxShadow: 'var(--s3)',
            animation: 'fadeUp 180ms ease both',
            zIndex: 500,
            whiteSpace: 'nowrap',
          }}
        >
          <MapPin size={14} strokeWidth={1.75} />
          Cliquez sur la carte pour définir votre départ
          <button
            onClick={togglePinDrop}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontFamily: 'inherit',
            }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Place detail overlay — desktop */}
      {selectedPlace && !isMobile && (
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: 16,
            bottom: 16,
            width: 304,
            zIndex: 600,
            animation: 'slideInRight 260ms cubic-bezier(0.16,1,0.3,1) both',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
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

      {/* ═══ MOBILE ═══ */}
      {isMobile && (
        <BottomSheet
          title={savedOnly ? 'Mes enregistrés' : 'Restaurants'}
          subtitle={
            savedOnly
              ? `${visiblePlaces.length} enregistré${visiblePlaces.length !== 1 ? 's' : ''}`
              : loading
                ? 'Chargement…'
                : `${visiblePlaces.length} trouvés`
          }
          defaultSnap="half"
          bottomOffset="calc(56px + env(safe-area-inset-bottom))"
        >
          <button
            onClick={() => setShowSurprise(true)}
            className="btn-ember"
            style={{ margin: '4px 0 12px' }}
          >
            <Sparkles size={16} strokeWidth={2} />
            Je ne sais pas quoi manger
          </button>
          {savedOnly && savedListTabs}
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
            onRetry={() => {
              const b = mapRef.current?.getBounds()
              if (b) fetchRestaurants(b)
            }}
            onShare={setSharePlace}
          />
        </BottomSheet>
      )}

      {isMobile && selectedPlace && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 'calc(56px + env(safe-area-inset-bottom))',
            zIndex: 900,
            animation: 'slideUp 260ms cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
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

      <Suspense>
        <AuthRequiredWatcher onOpen={() => setShowAuthModal(true)} />
      </Suspense>

      {showSurprise && (
        <SurpriseSheet
          places={filteredPlaces}
          knownCuisines={knownCuisines}
          isMobile={isMobile}
          onClose={() => setShowSurprise(false)}
          onSelectPlace={(p) => {
            setShowSurprise(false)
            handleMarkerClick(p)
          }}
          onToggleFavorite={handleToggleFavorite}
          onSeeSaved={() => {
            setShowSurprise(false)
            if (!savedOnly) toggleSavedOnly()
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal
          auth={auth}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(msg) => toast.success(msg)}
          onError={(msg) => toast.error(msg)}
        />
      )}

      {sharePlace && <ShareModal place={sharePlace} onClose={() => setSharePlace(null)} />}

      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes enrichSweep { 0%{left:-50%} 100%{left:100%} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
