// ============================================================
// types/index.ts — Shared TypeScript types for Restaurant Finder
// ============================================================

import type { PollResults } from '@/lib/polls'

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
  /** Friends who saved/visited this place (social proof on cards). */
  friendsSaved?: FriendLite[]
}

/** A community review left by a user on a place. */
export interface UserReview {
  id: string
  osm_id: string
  user_id: string
  author: FriendLite
  rating: number
  text: string | null
  photo_urls: string[]
  created_at: string
}

/** Aggregate of a place's community reviews. */
export interface ReviewSummary {
  count: number
  /** Mean rating rounded to one decimal, 0 when no reviews. */
  average: number
}

/** Minimal public profile shape for social-proof avatars. */
export interface FriendLite {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  verified?: boolean
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
  bio?: string | null
  username_changed_at: string | null
  created_at: string
  /** Verified tastemaker badge (granted via the verification flow). */
  verified?: boolean
}

// Amis — Étape A (FriendshipStatus défini dans lib/friends.ts, ré-exporté ici)
import type { FriendshipStatus } from '@/lib/friends'
export type { FriendshipStatus }

export interface FriendshipRow {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
  created_at: string
  responded_at: string | null
}

export interface UserSearchResult {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  status: FriendshipStatus
}

export interface FriendRequests {
  received: Profile[]
  sent: Profile[]
}

export interface PublicListCard {
  id: string
  name: string
  color_hue: number
  item_count: number
}

export interface PublicProfileBundle {
  profile: Profile
  status: FriendshipStatus
  friends_count: number
  mutuals: number
  blocked: boolean
  stats: { lists: number; places: number; cuisines: number }
  lists: PublicListCard[]
  /** Whether the viewer follows this profile (tastemakers). */
  is_following: boolean
  followers_count: number
  following_count: number
}

/** One entry in the "Tes tastemakers" feed: a review by someone you follow. */
export interface TastemakerFeedItem {
  id: string
  created_at: string
  author: FriendLite
  osm_id: string
  place_name: string
  rating: number
  text: string | null
  photo_urls: string[]
  place_snapshot: PlaceCard | null
}

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface VerificationRequest {
  id: string
  user_id: string
  note: string | null
  links: string[]
  status: Exclude<VerificationStatus, 'none'>
  reviewer_note: string | null
  created_at: string
  reviewed_at: string | null
}

/** A pending request joined with the requester's public profile (admin view). */
export interface VerificationRequestWithProfile extends VerificationRequest {
  profile: FriendLite
}

export interface FriendSuggestion {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  mutuals: number
}

export interface NotificationItem {
  id: string
  type: 'friend_request' | 'friend_accept' | 'message'
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
  actor: { id: string; username: string; display_name: string; avatar_url: string | null } | null
}

export interface ActivityItem {
  id: string
  type: 'favorite' | 'visit' | 'list'
  created_at: string
  osm_id: string | null
  place_name: string | null
  cuisine: string | null
  rating: number | null
  list_name: string | null
  actor: { id: string; username: string; display_name: string; avatar_url: string | null }
}

export interface PublicListDetail {
  list: { id: string; name: string; color_hue: number }
  items: PlaceCard[]
}

// ---------- Group polls ("où on mange ce soir ?") ----------

export interface PollOptionPublic {
  id: string
  place: PlaceCard
}

export interface PollPublic {
  id: string
  title: string
  closed: boolean
  /** Whether the requester is the poll's creator (from an optional bearer token). */
  isOwner: boolean
  options: PollOptionPublic[]
  results: PollResults
}

/** Row for the creator's "mes sondages" list. */
export interface PollSummary {
  id: string
  title: string
  closed: boolean
  total: number
  created_at: string
}

export interface MessagePlacePayload {
  osm_id: string
  name: string
  cuisine?: string | null
  lat?: number
  lon?: number
  photo?: string | null
}

/** Payload for a poll shared into a DM (message type 'poll'). */
export interface MessagePollPayload {
  poll_id: string
  title: string
}

export interface MessageRow {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  type?: 'text' | 'place' | 'poll'
  payload?: MessagePlacePayload | MessagePollPayload | null
  created_at: string
  read_at: string | null
  edited_at?: string | null
  deleted_at?: string | null
  reply_to?: string | null
  reactions?: MessageReaction[]
}

export interface MessageReaction {
  emoji: string
  count: number
  mine: boolean
}

export interface ConversationSummary {
  user: Profile
  last_message: string
  last_at: string
  last_from_me: boolean
  unread: number
  muted: boolean
}
