// ============================================================
// lib/hooks/useRouteCache.ts
// Client-side in-memory route cache + OSRM fetcher.
// Cache key: `${lat1},${lon1}→${lat2},${lon2}:${mode}`
// TTL: 15 minutes (routes don't change much)
// ============================================================
"use client";

import { useRef, useCallback, useState } from "react";

export type TransportMode = "foot" | "bike" | "car";

export interface RouteResult {
  duration: number;    // seconds
  distance: number;    // meters
  coords: [number, number][]; // [lat,lng] pairs for polyline
}

interface CacheEntry {
  result: RouteResult | null;
  ts: number;
}

const OSRM_PROFILES: Record<TransportMode, string> = {
  foot: "foot",
  bike: "bike",
  car:  "car",
};

const ROUTE_TTL_MS = 15 * 60 * 1000; // 15 min

async function fetchRoute(
  from: [number, number],
  to:   [number, number],
  mode: TransportMode
): Promise<RouteResult | null> {
  const profile = OSRM_PROFILES[mode];
  // OSRM uses lon,lat order
  const url =
    `https://router.project-osrm.org/route/v1/${profile}/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}` +
    `?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route = data.routes[0];
    const coords: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: number[]) => [lat, lng] as [number, number]
    );

    return {
      duration: route.duration,
      distance: route.legs[0].distance,
      coords,
    };
  } catch {
    return null;
  }
}

export function useRouteCache() {
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);

  const getRoute = useCallback(async (
    from:  [number, number],
    to:    [number, number],
    mode:  TransportMode
  ): Promise<RouteResult | null> => {
    const key = `${from[0].toFixed(5)},${from[1].toFixed(5)}→${to[0].toFixed(5)},${to[1].toFixed(5)}:${mode}`;
    const now = Date.now();

    // Hit cache
    const cached = cache.current.get(key);
    if (cached && now - cached.ts < ROUTE_TTL_MS) {
      return cached.result;
    }

    // Cancel previous in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const result = await fetchRoute(from, to, mode);
      cache.current.set(key, { result, ts: now });
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  return { getRoute, loading, clearCache };
}
