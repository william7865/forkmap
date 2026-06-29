// ============================================================
// types/index.ts — Shared TypeScript types for Restaurant Finder
// ============================================================

/** Raw OSM tag map */
export type OsmTags = Record<string, string>

/** Normalized place from Overpass (before enrichment) */
export interface PlaceBase {
  osm_id: string // e.g. "node/123456"
  osm_type: 'node' | 'way' | 'relation'
  name: string
  lat: number
  lon: number
  tags: OsmTags
  /** Derived from tags: cuisine type (e.g. "Italian", "French") */
  cuisine?: string
  /** Derived from tags: opening_hours raw string */
  opening_hours?: string
  /** Whether open now (if parseable) */
  open_now?: boolean
  /** Website if present in tags */
  website?: string
  /** Phone if present in tags */
  phone?: string
  /** Address reconstructed from tags */
  address?: string
}

/** Foursquare-enriched data (all optional since API may not return everything) */
export interface FoursquareData {
  fsq_id: string
  rating?: number // 0–10 scale
  price?: 1 | 2 | 3 | 4 // $ $$ $$$ $$$$
  total_ratings?: number
  categories?: FoursquareCategory[]
  photos?: FoursquarePhoto[]
  description?: string
  hours?: FoursquareHours
  website?: string
  tel?: string
  verified?: boolean
}

export interface FoursquareCategory {
  id: number
  name: string
  icon?: { prefix: string; suffix: string }
}

export interface FoursquarePhoto {
  id: string
  prefix: string
  suffix: string
  width: number
  height: number
}

export interface FoursquareHours {
  open_now?: boolean
  display?: string
  regular?: Array<{ day: number; open: string; close: string }>
}

/** Wikidata enrichment */
export interface WikidataData {
  wikidata_id?: string
  description?: string
  michelin_stars?: number
  distinctions?: string[]
  wikipedia_url?: string
  image_url?: string
}

/** Deep OSM tag extraction */
export interface OsmEnrichedData {
  email?: string
  instagram?: string
  facebook?: string
  booking_url?: string
  outdoor_seating?: boolean
  takeaway?: boolean
  delivery?: boolean
  wheelchair?: 'yes' | 'limited' | 'no'
  wifi?: boolean
  reservations?: boolean
  dogs_allowed?: boolean
  live_music?: boolean
  air_conditioning?: boolean
  drive_through?: boolean
  michelin?: number
  organic?: boolean
  vegetarian_friendly?: boolean
  halal?: boolean
  kosher?: boolean
  capacity?: number
  open_now?: boolean
  today_hours?: string
  brand?: string
  brand_wikidata?: string
  diet?: string[]
  payment_methods?: string[]
  postcode?: string
  city?: string
  district?: string
  floor?: string
}

/** Fully enriched place card shown in the UI */
export interface PlaceCard extends PlaceBase {
  fsq?: FoursquareData
  osm_enriched?: OsmEnrichedData
  wikidata?: WikidataData
  /** Computed FSQ rating, exposed at top level for convenience */
  fsq_rating?: number
  /** Distance from map center (meters), always computable */
  distance?: number
  /** Computed score for sorting */
  score?: number
  /** Is saved in user favorites */
  is_favorite?: boolean
  /** Number of times the user has visited this place */
  visitCount?: number
}

/** DB row: favorites table */
export interface FavoriteRow {
  id: string
  user_id: string
  osm_id: string
  name: string
  lat: number
  lon: number
  fsq_id?: string
  snapshot: PlaceCard // JSONB
  created_at: string
}

/** DB row: osm_fsq_mapping table */
export interface OsmFsqMapping {
  osm_id: string
  fsq_id: string
  matched_at: string
  confidence: number // 0–1
}

/** Filter state used in the UI */
export interface FilterState {
  minRating?: number // 0–10
  minRatings?: number // minimum number of reviews
  maxPrice?: 1 | 2 | 3 | 4
  cuisine?: string
  district?: string // arrondissement / quartier label (see lib/districts)
  openNow?: boolean
  maxDistance?: number // meters
  sortBy: 'distance' | 'rating' | 'score' | 'name'
}

/** Overpass query params */
export interface OverpassParams {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
  includeTypes?: Array<'restaurant' | 'cafe' | 'bar' | 'fast_food'>
}

/** Cache entry */
export interface CacheEntry<T> {
  data: T
  expiresAt: number // Date.now() ms
}

/** API response shapes */
export interface ApiResponse<T> {
  data?: T
  error?: string
  cached?: boolean
}

export interface OverpassApiResponse extends ApiResponse<PlaceBase[]> {
  count?: number
  bbox_key?: string
}

export interface EnrichApiResponse extends ApiResponse<PlaceCard[]> {
  enriched_count?: number
  cached_count?: number
}

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  username_changed_at: string | null
  created_at: string
}
