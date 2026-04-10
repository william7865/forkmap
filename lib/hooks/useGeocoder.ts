// ============================================================
// lib/hooks/useGeocoder.ts
// Nominatim address autocomplete with:
//   • 400ms debounce
//   • request dedup (cancel previous)
//   • min 3 chars
//   • result cache (5 min)
// ============================================================
"use client";

import { useState, useRef, useCallback } from "react";

export interface GeoResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

const GEO_CACHE = new Map<string, { results: GeoResult[]; ts: number }>();
const GEO_TTL = 5 * 60 * 1000;

async function nominatimSearch(q: string, signal: AbortSignal): Promise<GeoResult[]> {
  const cacheKey = q.toLowerCase().trim();
  const cached = GEO_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < GEO_TTL) return cached.results;

  const url = `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({ q, format: "json", limit: "6", addressdetails: "0", "accept-language": "fr,en" });

  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const results: GeoResult[] = await res.json();
  GEO_CACHE.set(cacheKey, { results, ts: Date.now() });
  return results;
}

export function useGeocoder() {
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [loading,     setLoading]     = useState(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef  = useRef<AbortController | null>(null);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 3) { setSuggestions([]); return; }

    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      try {
        const results = await nominatimSearch(query, abortRef.current.signal);
        setSuggestions(results);
      } catch {
        // aborted — ignore
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const clear = useCallback(() => {
    setSuggestions([]);
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  return { suggestions, loading, search, clear };
}
