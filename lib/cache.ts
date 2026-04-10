// ============================================================
// lib/cache.ts — In-memory cache (MVP) with optional Redis support
// ============================================================

import type { CacheEntry } from "@/types";

// ---------- In-memory store ----------
const store = new Map<string, CacheEntry<unknown>>();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

// ---------- Core cache functions ----------

/**
 * Get a cached value. Returns null if missing or expired.
 */
export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Set a value in cache with a TTL in seconds.
 */
export function cacheSet<T>(key: string, data: T, ttlSeconds = 600): void {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Delete a specific cache entry.
 */
export function cacheDel(key: string): void {
  store.delete(key);
}

/**
 * Cache-aside helper: if key exists return cached, otherwise run fn and cache result.
 */
export async function cacheAside<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
  const cached = cacheGet<T>(key);
  if (cached !== null) return { data: cached, cached: true };
  const data = await fn();
  cacheSet(key, data, ttlSeconds);
  return { data, cached: false };
}

// ---------- Key builders ----------

/**
 * Round bbox coordinates to avoid near-duplicate cache misses.
 * Rounds to 3 decimal places (~111m precision).
 */
export function buildBboxKey(
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
  types: string[] = ["restaurant"]
): string {
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return `overpass:${r(minLon)},${r(minLat)},${r(maxLon)},${r(maxLat)}:${types.sort().join("+")}`;
}

export function buildFsqKey(fsq_id: string): string {
  return `fsq:${fsq_id}`;
}

export function buildFsqSearchKey(lat: number, lon: number, name: string): string {
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return `fsq-search:${r(lat)},${r(lon)}:${name.toLowerCase().slice(0, 20)}`;
}
