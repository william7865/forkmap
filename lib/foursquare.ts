// ============================================================
// lib/foursquare.ts — Foursquare Places API v3 client
// ============================================================
// Uses FSQ Places API v3 (free tier: 1000 req/day).
// Docs: https://docs.foursquare.com/developer/reference/place-search
// ============================================================

import type {
  PlaceBase,
  PlaceCard,
  FoursquareData,
  FoursquareCategory,
  FoursquarePhoto,
} from "@/types";
import { cacheGet, cacheSet, buildFsqKey, buildFsqSearchKey } from "./cache";

const FSQ_BASE = "https://api.foursquare.com/v3";
const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY ?? "";

// Fields to request — keep minimal to save quota
const SEARCH_FIELDS = "fsq_id,name,geocodes,location,categories";
const DETAIL_FIELDS =
  "fsq_id,name,geocodes,location,categories,rating,stats,price,description,hours,website,tel,verified,photos";

// ---------- Helpers ----------

function fsqHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: FSQ_API_KEY,
  };
}

async function fsqGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${FSQ_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: fsqHeaders(),
    next: { revalidate: 3600 }, // Next.js fetch cache 1h
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FSQ ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

// ---------- Types from FSQ API ----------

interface FsqSearchResult {
  results: FsqVenue[];
}

interface FsqVenue {
  fsq_id: string;
  name: string;
  geocodes: { main: { latitude: number; longitude: number } };
  location?: { formatted_address?: string };
  categories?: Array<{ id: number; name: string; icon: { prefix: string; suffix: string } }>;
  rating?: number;
  stats?: { total_ratings?: number; total_photos?: number };
  price?: number;
  description?: string;
  hours?: {
    open_now?: boolean;
    display?: string;
    regular?: Array<{ day: number; open: string; close: string }>;
  };
  website?: string;
  tel?: string;
  verified?: boolean;
  photos?: Array<{ id: string; prefix: string; suffix: string; width: number; height: number }>;
}

// ---------- Fuzzy name matching ----------

/**
 * Levenshtein distance (simple implementation).
 * Used to fuzzy-match OSM name vs FSQ name.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function nameSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

// ---------- Normalizer ----------

function normalizeFsqVenue(venue: FsqVenue): FoursquareData {
  const categories: FoursquareCategory[] = (venue.categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
  }));

  const photos: FoursquarePhoto[] = (venue.photos ?? []).slice(0, 3).map((p) => ({
    id: p.id,
    prefix: p.prefix,
    suffix: p.suffix,
    width: p.width,
    height: p.height,
  }));

  return {
    fsq_id: venue.fsq_id,
    rating: venue.rating,
    price: venue.price as 1 | 2 | 3 | 4 | undefined,
    total_ratings: venue.stats?.total_ratings,
    categories,
    photos: photos.length > 0 ? photos : undefined,
    description: venue.description,
    hours: venue.hours
      ? {
          open_now: venue.hours.open_now,
          display: venue.hours.display,
          regular: venue.hours.regular,
        }
      : undefined,
    website: venue.website,
    tel: venue.tel,
    verified: venue.verified,
  };
}

// ---------- Search + match ----------

const RADIUS_M = 100; // Search radius for FSQ match (meters)
const MIN_NAME_SIMILARITY = 0.6; // Threshold to consider a match valid

/**
 * Search FSQ for a single place by lat/lon + name.
 * Returns the best matching FSQ venue or null.
 */
async function searchFsqVenue(place: PlaceBase): Promise<FoursquareData | null> {
  if (!FSQ_API_KEY) {
    console.warn("FOURSQUARE_API_KEY not set — skipping enrichment");
    return null;
  }

  const cacheKey = buildFsqSearchKey(place.lat, place.lon, place.name);
  const cached = cacheGet<FoursquareData | null>(cacheKey);
  if (cached !== undefined && cached !== null) return cached;
  if (cached === null) return null; // explicitly cached as "no match"

  try {
    const data = await fsqGet<FsqSearchResult>("/places/search", {
      ll: `${place.lat},${place.lon}`,
      radius: String(RADIUS_M),
      name: place.name,
      fields: SEARCH_FIELDS,
      limit: "5",
    });

    // Find best name match from results
    const results = data.results ?? [];
    let bestMatch: FsqVenue | null = null;
    let bestScore = 0;

    for (const venue of results) {
      const sim = nameSimilarity(place.name, venue.name);
      if (sim > bestScore && sim >= MIN_NAME_SIMILARITY) {
        bestScore = sim;
        bestMatch = venue;
      }
    }

    if (!bestMatch) {
      cacheSet(cacheKey, null, 3600); // Cache negative result for 1h
      return null;
    }

    // Fetch full details
    const detail = await getFsqDetails(bestMatch.fsq_id);
    if (detail) cacheSet(cacheKey, detail, 3600);
    return detail;
  } catch (err) {
    console.warn(`FSQ search failed for "${place.name}":`, err);
    return null;
  }
}

/**
 * Fetch full FSQ venue details by fsq_id (with caching).
 */
async function getFsqDetails(fsq_id: string): Promise<FoursquareData | null> {
  const cacheKey = buildFsqKey(fsq_id);
  const cached = cacheGet<FoursquareData>(cacheKey);
  if (cached) return cached;

  try {
    const venue = await fsqGet<FsqVenue>(`/places/${fsq_id}`, { fields: DETAIL_FIELDS });
    const data = normalizeFsqVenue(venue);
    cacheSet(cacheKey, data, 3600); // Cache 1h
    return data;
  } catch (err) {
    console.warn(`FSQ details failed for ${fsq_id}:`, err);
    return null;
  }
}

// ---------- Batch enrichment ----------

/**
 * Enrich a batch of PlaceBase with Foursquare data.
 * Processes concurrently with rate-limiting (max 5 at a time).
 */
export async function enrichPlaces(places: PlaceBase[]): Promise<PlaceCard[]> {
  const CONCURRENCY = 5;
  const results: PlaceCard[] = [];

  for (let i = 0; i < places.length; i += CONCURRENCY) {
    const batch = places.slice(i, i + CONCURRENCY);
    const enriched = await Promise.all(
      batch.map(async (place) => {
        const fsq = await searchFsqVenue(place);
        const card: PlaceCard = { ...place, fsq: fsq ?? undefined };
        // Prefer FSQ open_now over OSM parsing
        if (fsq?.hours?.open_now !== undefined) {
          card.open_now = fsq.hours.open_now;
        }
        return card;
      })
    );
    results.push(...enriched);
  }

  return results;
}

// ---------- Photo URL helper ----------

export function getFsqPhotoUrl(
  photo: { prefix: string; suffix: string },
  size: `${number}x${number}` = "400x300"
): string {
  return `${photo.prefix}${size}${photo.suffix}`;
}
