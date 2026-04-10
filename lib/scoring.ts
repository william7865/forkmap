// ============================================================
// lib/scoring.ts — Distance calculation + composite scoring
// ============================================================

import type { PlaceCard, FilterState } from "@/types";

// ---------- Distance ----------

/**
 * Haversine distance between two lat/lon points.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Annotate places with distance from a center point.
 */
export function annotateDistances(
  places: PlaceCard[],
  centerLat: number,
  centerLon: number
): PlaceCard[] {
  return places.map((p) => ({
    ...p,
    distance: haversineDistance(centerLat, centerLon, p.lat, p.lon),
  }));
}

// ---------- Composite score ----------

/**
 * Compute a composite score [0–1] for sorting.
 * Weights: rating 40%, popularity 20%, distance 30%, verified 10%.
 * Falls back gracefully when data is missing.
 */
export function computeScore(
  place: PlaceCard,
  maxDistanceM = 2000
): number {
  const ratingScore = place.fsq?.rating != null ? place.fsq.rating / 10 : 0.5;
  const popularityScore =
    place.fsq?.total_ratings != null
      ? Math.min(place.fsq.total_ratings / 500, 1)
      : 0.3;
  const distanceScore =
    place.distance != null
      ? Math.max(0, 1 - place.distance / maxDistanceM)
      : 0.5;
  const verifiedScore = place.fsq?.verified ? 1 : 0;

  // Bonus: OSM-derived quality signals (free data!)
  const openNowBonus = place.open_now === true ? 0.1 : 0;
  const michelinBonus = (place.osm_enriched?.michelin ?? place.wikidata?.michelin_stars ?? 0) > 0 ? 0.2 : 0;
  const hasPhotoBonus = (place.fsq?.photos?.length ?? 0) > 0 ? 0.05 : 0;
  const hasAddressBonus = place.address ? 0.03 : 0;
  const hasWebsiteBonus = (place.website || place.fsq?.website) ? 0.03 : 0;

  const raw =
    ratingScore * 0.38 +
    popularityScore * 0.18 +
    distanceScore * 0.28 +
    verifiedScore * 0.08 +
    openNowBonus +
    michelinBonus +
    hasPhotoBonus +
    hasAddressBonus +
    hasWebsiteBonus;

  return Math.min(raw, 1);
}

export function annotateScores(places: PlaceCard[], maxDistanceM = 2000): PlaceCard[] {
  return places.map((p) => ({ ...p, score: computeScore(p, maxDistanceM) }));
}

// ---------- Filter + sort ----------

/**
 * Apply FilterState to a list of PlaceCard.
 */
export function applyFilters(places: PlaceCard[], filters: FilterState): PlaceCard[] {
  let result = [...places];

  if (filters.minRating != null) {
    result = result.filter(
      (p) => p.fsq?.rating == null || p.fsq.rating >= filters.minRating!
    );
  }

  if (filters.minRatings != null) {
    result = result.filter(
      (p) => p.fsq?.total_ratings == null || p.fsq.total_ratings >= filters.minRatings!
    );
  }

  if (filters.maxPrice != null) {
    result = result.filter(
      (p) => p.fsq?.price == null || p.fsq.price <= filters.maxPrice!
    );
  }

  if (filters.cuisine) {
    const q = filters.cuisine.toLowerCase();
    result = result.filter(
      (p) =>
        p.cuisine?.toLowerCase().includes(q) ||
        p.fsq?.categories?.some((c) => c.name.toLowerCase().includes(q))
    );
  }

  if (filters.openNow) {
    result = result.filter((p) => p.open_now === true);
  }

  if (filters.maxDistance != null) {
    result = result.filter(
      (p) => p.distance == null || p.distance <= filters.maxDistance!
    );
  }

  // Sort
  result.sort((a, b) => {
    switch (filters.sortBy) {
      case "rating":
        return (b.fsq?.rating ?? 0) - (a.fsq?.rating ?? 0);
      case "distance":
        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      case "name":
        return a.name.localeCompare(b.name);
      case "score":
      default:
        return (b.score ?? 0) - (a.score ?? 0);
    }
  });

  return result;
}

// ---------- Cuisine list extractor ----------

/**
 * Extract unique cuisines from a list of places for the filter dropdown.
 */
export function extractCuisines(places: PlaceCard[]): string[] {
  const set = new Set<string>();
  for (const p of places) {
    if (p.cuisine) set.add(p.cuisine);
    for (const c of p.fsq?.categories ?? []) {
      if (c.name) set.add(c.name);
    }
  }
  return Array.from(set).sort();
}
