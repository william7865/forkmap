"use client";
import { useState, useCallback, useMemo, useRef } from "react";
import type { PlaceCard, FilterState } from "@/types";
import { useRestaurants } from "@/lib/hooks/useRestaurants";
import { useRouteCache, type TransportMode } from "@/lib/hooks/useRouteCache";
import { useAuth } from "@/lib/hooks/useAuth";
import { useToast } from "@/lib/hooks/useToast";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { useLanguage } from "@/lib/i18n/useLanguage";
import type { MapViewHandle } from "@/components/map/MapView";

export function useHomeState() {
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
  const [sharePlace,       setSharePlace]       = useState<PlaceCard|null>(null);
  const [searchFocused,    setSearchFocused]    = useState(false);
  const [recentSearches,   setRecentSearches]   = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("forkmap_recent_searches") ?? "[]");
    } catch {
      return [];
    }
  });

  const currentBboxRef = useRef<string>("");
  const mapRef         = useRef<MapViewHandle>(null);

  const { getRoute, loading: routeLoading } = useRouteCache();
  const [routeResult, setRouteResult] = useState<{ duration:number; distance:number; coords:[number,number][] }|null>(null);

  // ── Filters ───────────────────────────────────────────────
  const activeCount = Object.keys(filters).filter(k => k !== "sortBy" && filters[k as keyof FilterState] != null).length;

  const handleFilters = useCallback((f: FilterState) => {
    setFilters(f);
    applyClientFilters(f);
  }, [applyClientFilters]);

  const handleCuisineFilter = useCallback((cuisine: string) => {
    setFilters(prev => ({ ...prev, cuisine }));
    applyClientFilters({ ...filters, cuisine });
  }, [filters, applyClientFilters]);

  const saveSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    setRecentSearches(prev => {
      const next = [q, ...prev.filter(s => s !== q)].slice(0, 5);
      localStorage.setItem("forkmap_recent_searches", JSON.stringify(next));
      return next;
    });
  }, []);

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

  // ── Top cuisines for quick filter chips ──────────────────
  const topCuisines = useMemo(() => {
    const cuisineMap = new Map<string, number>();
    visiblePlaces.forEach(p => {
      if (p.cuisine) cuisineMap.set(p.cuisine, (cuisineMap.get(p.cuisine) ?? 0) + 1);
    });
    return [...cuisineMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  }, [visiblePlaces]);

  // ── Location ──────────────────────────────────────────────
  const handleLocationChange = useCallback((lat: number, lon: number, label: string) => {
    setUserLocation([lat, lon]);
    setLocationLabel(label);
    mapRef.current?.flyTo(lat, lon, 15);
  }, []);

  const locate = useCallback(() => {
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

  // ── Nearby places ─────────────────────────────────────────
  const nearbyPlaces = useMemo(() => {
    if (!selectedPlace) return [];
    return places
      .filter(p => p.osm_id !== selectedPlace.osm_id)
      .filter(p => {
        const selLat = selectedPlace.lat;
        const selLon = selectedPlace.lon;
        const dx = (p.lon - selLon) * Math.cos((selLat * Math.PI) / 180) * 111320;
        const dy = (p.lat - selLat) * 111320;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const sameCuisine = !!(p.cuisine && selectedPlace.cuisine &&
          p.cuisine.toLowerCase() === selectedPlace.cuisine.toLowerCase());
        return dist < 600 || sameCuisine;
      })
      .map(p => {
        const selLat = selectedPlace.lat;
        const selLon = selectedPlace.lon;
        const dx = (p.lon - selLon) * Math.cos((selLat * Math.PI) / 180) * 111320;
        const dy = (p.lat - selLat) * 111320;
        return { ...p, distance: Math.round(Math.sqrt(dx*dx + dy*dy)) };
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
    if (isCurrentlyFav) {
      toast.info(`"${place.name}" retiré des favoris`);
    } else {
      toast.success("❤️ Ajouté aux favoris", 5000, {
        label: "Annuler",
        onClick: () => toggleFavorite(place),
      });
    }
  }, [toggleFavorite, favoriteIds, toast]);

  return {
    // contexts
    auth, toast, isMobile, tr,
    // data
    filteredPlaces, loading, enriching, error, places, fetchRestaurants,
    favoriteIds, routeLoading, routeResult,
    // state
    selectedPlace, setSelectedPlace,
    hoveredId, setHoveredId,
    filters, setFilters,
    nameQuery, setNameQuery,
    showFilters, setShowFilters,
    showAuthModal, setShowAuthModal,
    showSearchHere,
    pinDropActive,
    routeMode,
    userLocation,
    locationLabel,
    locating, locateError,
    sidebarCollapsed, setSidebarCollapsed,
    sharePlace, setSharePlace,
    searchFocused, setSearchFocused,
    recentSearches, setRecentSearches,
    // derived
    activeCount, visiblePlaces, topCuisines, nearbyPlaces,
    // refs
    mapRef,
    // handlers
    handleFilters, handleCuisineFilter, saveSearch,
    handleLocationChange, locate,
    togglePinDrop, handlePinDrop,
    handleMoveEnd, doSearchHere,
    handleMarkerClick, handleTransportChange,
    handleCloseDetail, handleToggleFavorite,
  };
}
