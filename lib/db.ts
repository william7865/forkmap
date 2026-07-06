// ============================================================
// lib/db.ts — Supabase client + DB helpers
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type {
  ActivityItem,
  ConversationSummary,
  FavoriteRow,
  FriendRequests,
  FriendshipRow,
  FriendshipStatus,
  MessageRow,
  NotificationItem,
  OsmFsqMapping,
  PlaceCard,
  PollPublic,
  PollSummary,
  Profile,
  PublicListCard,
  PublicListDetail,
  PublicProfileBundle,
  UserSearchResult,
} from '@/types'
import { canChangeUsername } from '@/lib/username'
import { relationFrom } from '@/lib/friends'
import { tallyVotes } from '@/lib/polls'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side only client (service role — never expose to client)
export const db = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

// ---------- Favorites ----------

export async function getFavorites(userId: string): Promise<FavoriteRow[]> {
  const { data, error } = await db
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as FavoriteRow[]
}

export async function addFavorite(userId: string, place: PlaceCard): Promise<FavoriteRow> {
  const row = {
    user_id: userId,
    osm_id: place.osm_id,
    name: place.name,
    lat: place.lat,
    lon: place.lon,
    fsq_id: place.fsq?.fsq_id,
    snapshot: place,
  }

  const { data, error } = await db
    .from('favorites')
    .upsert(row, { onConflict: 'user_id,osm_id' })
    .select()
    .single()

  if (error) throw error
  return data as FavoriteRow
}

export async function removeFavorite(userId: string, osmId: string): Promise<void> {
  const { error } = await db.from('favorites').delete().eq('user_id', userId).eq('osm_id', osmId)

  if (error) throw error
}

// ---------- Personal notes (synced) ----------

export interface NoteRow {
  osm_id: string
  text: string
  updated_at: string
}

export async function getNotes(userId: string): Promise<NoteRow[]> {
  const { data, error } = await db
    .from('notes')
    .select('osm_id, text, updated_at')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []) as NoteRow[]
}

export async function upsertNote(userId: string, osmId: string, text: string): Promise<void> {
  const { error } = await db
    .from('notes')
    .upsert(
      { user_id: userId, osm_id: osmId, text, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,osm_id' }
    )
  if (error) throw error
}

export async function deleteNote(userId: string, osmId: string): Promise<void> {
  const { error } = await db.from('notes').delete().eq('user_id', userId).eq('osm_id', osmId)
  if (error) throw error
}

// ---------- OSM ↔ FSQ mapping ----------

export async function getFsqMapping(osmId: string): Promise<OsmFsqMapping | null> {
  const { data } = await db.from('osm_fsq_mapping').select('*').eq('osm_id', osmId).maybeSingle()

  return data as OsmFsqMapping | null
}

export async function saveFsqMapping(
  osmId: string,
  fsqId: string,
  confidence: number
): Promise<void> {
  await db
    .from('osm_fsq_mapping')
    .upsert(
      { osm_id: osmId, fsq_id: fsqId, confidence, matched_at: new Date().toISOString() },
      { onConflict: 'osm_id' }
    )
}

// ---------- Visits ----------

export interface VisitRow {
  id: string
  user_id: string
  osm_id: string
  name: string
  lat: number
  lon: number
  visited_at: string // ISO date "YYYY-MM-DD"
  amount_spent?: number
  people_count: number
  personal_rating?: number // 1–5
  mood?: string
  note?: string
  snapshot?: PlaceCard
  created_at: string
  updated_at: string
}

export type VisitInput = Omit<VisitRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export async function getVisits(userId: string): Promise<VisitRow[]> {
  const { data, error } = await db
    .from('visits')
    .select('*')
    .eq('user_id', userId)
    .order('visited_at', { ascending: false })
  if (error) throw error
  return data as VisitRow[]
}

export async function getVisitsByPlace(userId: string, osmId: string): Promise<VisitRow[]> {
  const { data, error } = await db
    .from('visits')
    .select('*')
    .eq('user_id', userId)
    .eq('osm_id', osmId)
    .order('visited_at', { ascending: false })
  if (error) throw error
  return data as VisitRow[]
}

export async function addVisit(userId: string, visit: VisitInput): Promise<VisitRow> {
  const { data, error } = await db
    .from('visits')
    .insert({ ...visit, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as VisitRow
}

export async function updateVisit(
  userId: string,
  visitId: string,
  patch: Partial<VisitInput>
): Promise<VisitRow> {
  const { data, error } = await db
    .from('visits')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', visitId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data as VisitRow
}

export async function deleteVisit(userId: string, visitId: string): Promise<void> {
  const { error } = await db.from('visits').delete().eq('id', visitId).eq('user_id', userId)
  if (error) throw error
}

// ── Stats aggregation ────────────────────────────────────────
export interface VisitStats {
  total_visits: number
  unique_restaurants: number
  total_spent: number
  avg_spent_per_meal: number
  avg_personal_rating: number
  top_restaurants: {
    osm_id: string
    name: string
    count: number
    total_spent: number
    avg_rating: number
  }[]
  visits_by_month: { month: string; count: number; spent: number }[]
  mood_breakdown: { mood: string; count: number }[]
  cuisine_breakdown: { cuisine: string; count: number; spent: number }[]
}

export async function getVisitStats(userId: string): Promise<VisitStats> {
  const visits = await getVisits(userId)

  const totalSpent = visits.reduce((s, v) => s + (v.amount_spent ?? 0), 0)
  const withSpend = visits.filter((v) => v.amount_spent != null && v.amount_spent > 0)
  const withRating = visits.filter((v) => v.personal_rating != null)

  // Top restaurants by visit count
  const byPlace: Record<string, { name: string; count: number; spent: number; ratings: number[] }> =
    {}
  for (const v of visits) {
    if (!byPlace[v.osm_id]) byPlace[v.osm_id] = { name: v.name, count: 0, spent: 0, ratings: [] }
    byPlace[v.osm_id].count++
    byPlace[v.osm_id].spent += v.amount_spent ?? 0
    if (v.personal_rating) byPlace[v.osm_id].ratings.push(v.personal_rating)
  }
  const topRestaurants = Object.entries(byPlace)
    .map(([osm_id, d]) => ({
      osm_id,
      name: d.name,
      count: d.count,
      total_spent: Math.round(d.spent * 100) / 100,
      avg_rating: d.ratings.length
        ? Math.round((d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length) * 10) / 10
        : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Visits by month (last 12 months)
  const monthMap: Record<string, { count: number; spent: number }> = {}
  for (const v of visits) {
    const m = v.visited_at.slice(0, 7) // "YYYY-MM"
    if (!monthMap[m]) monthMap[m] = { count: 0, spent: 0 }
    monthMap[m].count++
    monthMap[m].spent += v.amount_spent ?? 0
  }
  const visitsByMonth = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, d]) => ({ month, count: d.count, spent: Math.round(d.spent * 100) / 100 }))

  // Mood breakdown
  const moodMap: Record<string, number> = {}
  for (const v of visits) {
    const m = v.mood ?? 'solo'
    moodMap[m] = (moodMap[m] ?? 0) + 1
  }
  const moodBreakdown = Object.entries(moodMap)
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count)

  // Cuisine breakdown
  const cuisineMap: Record<string, { count: number; spent: number }> = {}
  for (const v of visits) {
    const snap = v.snapshot
    const c = snap?.cuisine ?? snap?.fsq?.categories?.[0]?.name ?? 'Autre'
    if (!cuisineMap[c]) cuisineMap[c] = { count: 0, spent: 0 }
    cuisineMap[c].count++
    cuisineMap[c].spent += v.amount_spent ?? 0
  }
  const cuisineBreakdown = Object.entries(cuisineMap)
    .map(([cuisine, d]) => ({ cuisine, count: d.count, spent: Math.round(d.spent * 100) / 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return {
    total_visits: visits.length,
    unique_restaurants: Object.keys(byPlace).length,
    total_spent: Math.round(totalSpent * 100) / 100,
    avg_spent_per_meal: withSpend.length
      ? Math.round((totalSpent / withSpend.length) * 100) / 100
      : 0,
    avg_personal_rating: withRating.length
      ? Math.round(
          (withRating.reduce((s, v) => s + (v.personal_rating ?? 0), 0) / withRating.length) * 10
        ) / 10
      : 0,
    top_restaurants: topRestaurants,
    visits_by_month: visitsByMonth,
    mood_breakdown: moodBreakdown,
    cuisine_breakdown: cuisineBreakdown,
  }
}

// ---------- List types ----------

export interface CollaboratorLite {
  id: string
  display_name: string
  avatar_url: string | null
}

export interface ListRow {
  id: string
  user_id: string
  name: string
  description: string | null
  is_public: boolean
  color_hue: number
  created_at: string
  updated_at: string
  item_count?: number
  /** True when the current user is a collaborator (not the owner) of this list. */
  is_collaborator?: boolean
  /** Owner display name, set on lists shared *with* the current user. */
  shared_by?: string | null
  /** Collaborators of an owned list (for the avatar stack). */
  collaborators?: CollaboratorLite[]
}

export interface ListItemRow {
  id: string
  list_id: string
  osm_id: string
  place_snapshot: Record<string, unknown>
  added_at: string
}

// ---------- Lists ----------

function mapListRow(row: unknown, extra: Partial<ListRow> = {}): ListRow {
  const list = row as Record<string, unknown>
  return {
    id: list.id as string,
    user_id: list.user_id as string,
    name: list.name as string,
    description: list.description as string | null,
    is_public: list.is_public as boolean,
    color_hue: list.color_hue as number,
    created_at: list.created_at as string,
    updated_at: list.updated_at as string,
    item_count: (list.list_items as { count: number }[])?.[0]?.count ?? 0,
    ...extra,
  }
}

/** Fetch light profiles (id/name/avatar) for a set of user ids. */
async function getProfilesLite(ids: string[]): Promise<Map<string, CollaboratorLite>> {
  const map = new Map<string, CollaboratorLite>()
  if (ids.length === 0) return map
  const { data } = await db
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', [...new Set(ids)])
  for (const r of data ?? []) {
    const p = r as CollaboratorLite
    map.set(p.id, { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url ?? null })
  }
  return map
}

export async function getLists(userId: string): Promise<ListRow[]> {
  // Owned lists.
  const { data: owned, error } = await db
    .from('lists')
    .select('*, list_items(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const ownedRows = owned ?? []

  // Lists shared *with* this user (collaborator memberships).
  const { data: memberships } = await db
    .from('list_collaborators')
    .select('list_id')
    .eq('user_id', userId)
  const sharedIds = (memberships ?? []).map((m) => (m as { list_id: string }).list_id)

  let sharedRows: unknown[] = []
  if (sharedIds.length) {
    const { data } = await db
      .from('lists')
      .select('*, list_items(count)')
      .in('id', sharedIds)
      .order('created_at', { ascending: false })
    sharedRows = data ?? []
  }

  // Collaborators of owned lists (for the avatar stack).
  const ownedIds = ownedRows.map((l) => (l as { id: string }).id)
  const collabByList = new Map<string, string[]>()
  if (ownedIds.length) {
    const { data: collabs } = await db
      .from('list_collaborators')
      .select('list_id, user_id')
      .in('list_id', ownedIds)
    for (const c of collabs ?? []) {
      const row = c as { list_id: string; user_id: string }
      const arr = collabByList.get(row.list_id) ?? []
      arr.push(row.user_id)
      collabByList.set(row.list_id, arr)
    }
  }

  // Profiles needed: collaborators of owned lists + owners of shared lists.
  const profileIds = [
    ...[...collabByList.values()].flat(),
    ...sharedRows.map((l) => (l as { user_id: string }).user_id),
  ]
  const profiles = await getProfilesLite(profileIds)

  const ownedMapped = ownedRows.map((l) => {
    const id = (l as { id: string }).id
    const collaborators = (collabByList.get(id) ?? [])
      .map((uid) => profiles.get(uid))
      .filter((p): p is CollaboratorLite => !!p)
    return mapListRow(l, { is_collaborator: false, collaborators })
  })

  const sharedMapped = sharedRows.map((l) => {
    const ownerId = (l as { user_id: string }).user_id
    return mapListRow(l, {
      is_collaborator: true,
      shared_by: profiles.get(ownerId)?.display_name ?? null,
    })
  })

  return [...ownedMapped, ...sharedMapped]
}

// ---------- List collaborators ----------

/** Whether a user may edit a list (owner or collaborator). */
export async function canEditList(listId: string, userId: string): Promise<boolean> {
  const { data: list } = await db.from('lists').select('user_id').eq('id', listId).maybeSingle()
  if (!list) return false
  if ((list as { user_id: string }).user_id === userId) return true
  const { data: collab } = await db
    .from('list_collaborators')
    .select('id')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!collab
}

async function isListOwner(listId: string, userId: string): Promise<boolean> {
  const { data } = await db
    .from('lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function isCollaborator(listId: string, userId: string): Promise<boolean> {
  const { data } = await db
    .from('list_collaborators')
    .select('id')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

/** Owner adds a friend as a collaborator. Guards owner + accepted friendship. */
export async function addCollaborator(
  ownerId: string,
  listId: string,
  friendId: string
): Promise<void> {
  if (ownerId === friendId) throw new Error('cannot_add_self')
  if (!(await isListOwner(listId, ownerId))) throw new Error('not_owner')
  const rel = await getFriendshipRow(ownerId, friendId)
  if (!rel || rel.status !== 'accepted') throw new Error('not_friends')
  const { error } = await db
    .from('list_collaborators')
    .upsert({ list_id: listId, user_id: friendId }, { onConflict: 'list_id,user_id' })
  if (error) throw error
}

/** Owner removes a collaborator. */
export async function removeCollaborator(
  ownerId: string,
  listId: string,
  userId: string
): Promise<void> {
  if (!(await isListOwner(listId, ownerId))) throw new Error('not_owner')
  const { error } = await db
    .from('list_collaborators')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', userId)
  if (error) throw error
}

/** Profiles of a list's collaborators. Caller must be owner or collaborator. */
export async function getCollaborators(listId: string): Promise<CollaboratorLite[]> {
  const { data } = await db.from('list_collaborators').select('user_id').eq('list_id', listId)
  const ids = (data ?? []).map((r) => (r as { user_id: string }).user_id)
  const profiles = await getProfilesLite(ids)
  return ids.map((id) => profiles.get(id)).filter((p): p is CollaboratorLite => !!p)
}

export async function createList(
  userId: string,
  name: string,
  description: string | null,
  isPublic: boolean
): Promise<ListRow> {
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  const { data, error } = await db
    .from('lists')
    .insert({ user_id: userId, name, description, is_public: isPublic, color_hue: hue })
    .select()
    .single()
  if (error) throw error
  return data as ListRow
}

export async function updateList(
  listId: string,
  userId: string,
  patch: { name?: string; description?: string | null; is_public?: boolean }
): Promise<ListRow> {
  const { data, error } = await db
    .from('lists')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', listId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  if (!data) throw new Error('Not found')
  return data as ListRow
}

export async function deleteList(listId: string, userId: string): Promise<void> {
  const { error } = await db.from('lists').delete().eq('id', listId).eq('user_id', userId)
  if (error) throw error
}

// ---------- List items ----------

export async function getListItems(listId: string, userId: string): Promise<ListItemRow[]> {
  if (!(await canEditList(listId, userId))) throw new Error('Not found or not authorized')

  const { data, error } = await db
    .from('list_items')
    .select('*')
    .eq('list_id', listId)
    .order('added_at', { ascending: false })
  if (error) throw error
  return data as ListItemRow[]
}

export async function addListItem(
  listId: string,
  userId: string,
  osmId: string,
  placeSnapshot: Record<string, unknown>
): Promise<ListItemRow> {
  if (!(await canEditList(listId, userId))) throw new Error('Not found or not authorized')

  const { data, error } = await db
    .from('list_items')
    .upsert(
      { list_id: listId, osm_id: osmId, place_snapshot: placeSnapshot },
      { onConflict: 'list_id,osm_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data as ListItemRow
}

export async function removeListItem(listId: string, userId: string, osmId: string): Promise<void> {
  if (!(await canEditList(listId, userId))) throw new Error('Not found or not authorized')

  const { error } = await db.from('list_items').delete().eq('list_id', listId).eq('osm_id', osmId)
  if (error) throw error
}

export async function getListsForPlace(userId: string, osmId: string): Promise<string[]> {
  const { data, error } = await db
    .from('list_items')
    .select('list_id, lists!inner(user_id)')
    .eq('osm_id', osmId)
    .eq('lists.user_id', userId)
  if (error) throw error
  return (data ?? []).map((row: { list_id: string }) => row.list_id)
}

export async function getPublicListWithItems(listId: string): Promise<PublicListDetail | null> {
  const { data: list, error: listErr } = await db
    .from('lists')
    .select('id, name, color_hue, is_public')
    .eq('id', listId)
    .eq('is_public', true)
    .maybeSingle()
  if (listErr) throw listErr
  if (!list) return null

  const { data: items, error: itemsErr } = await db
    .from('list_items')
    .select('place_snapshot')
    .eq('list_id', listId)
    .order('added_at', { ascending: false })
  if (itemsErr) throw itemsErr

  const l = list as { id: string; name: string; color_hue: number }
  return {
    list: { id: l.id, name: l.name, color_hue: l.color_hue },
    items: (items ?? []).map((it) => (it as { place_snapshot: PlaceCard }).place_snapshot),
  }
}

// ---------- Push tokens ----------

export type PushPlatform = 'ios' | 'android' | 'web'

export interface PushTokenRow {
  id: string
  user_id: string
  token: string
  platform: PushPlatform
  created_at: string
  updated_at: string
}

/** Register (or refresh) a device push token for a user. Idempotent per (user, token). */
export async function savePushToken(
  userId: string,
  token: string,
  platform: PushPlatform
): Promise<void> {
  const { error } = await db
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    )
  if (error) throw error
}

// ---------- Profiles ----------

export class UsernameLockedError extends Error {
  nextChangeAt: string
  constructor(nextChangeAt: string) {
    super('username_locked')
    this.name = 'UsernameLockedError'
    this.nextChangeAt = nextChangeAt
  }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return (data as Profile) ?? null
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle()
  if (error) throw error
  return (data as Profile) ?? null
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await db
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .maybeSingle()
  if (error) throw error
  return data == null
}

export async function createProfile(
  userId: string,
  p: { username: string; display_name: string; avatar_url: string | null }
): Promise<Profile> {
  const { data, error } = await db
    .from('profiles')
    .insert({
      id: userId,
      username: p.username.toLowerCase(),
      display_name: p.display_name,
      avatar_url: p.avatar_url,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}

export async function updateProfile(
  userId: string,
  patch: {
    display_name?: string
    avatar_url?: string | null
    username?: string
    bio?: string | null
  }
): Promise<Profile> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.display_name !== undefined) update.display_name = patch.display_name
  if (patch.avatar_url !== undefined) update.avatar_url = patch.avatar_url
  if (patch.bio !== undefined) update.bio = patch.bio

  if (patch.username !== undefined) {
    const current = await getProfile(userId)
    if (!current) throw new Error('no_profile')
    if (patch.username.toLowerCase() !== current.username) {
      const gate = canChangeUsername(current.username_changed_at, Date.now())
      if (!gate.ok) throw new UsernameLockedError(gate.nextChangeAt)
      update.username = patch.username.toLowerCase()
      update.username_changed_at = new Date().toISOString()
    }
  }

  const { data, error } = await db
    .from('profiles')
    .update(update)
    .eq('id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}

// ---------- Friends ----------

// Cherche la ligne d'amitié entre deux users, peu importe le sens.
export async function getFriendshipRow(aId: string, bId: string): Promise<FriendshipRow | null> {
  const { data, error } = await db
    .from('friendships')
    .select('*')
    .or(
      `and(requester_id.eq.${aId},addressee_id.eq.${bId}),and(requester_id.eq.${bId},addressee_id.eq.${aId})`
    )
    .maybeSingle()
  if (error) throw error
  return (data as FriendshipRow) ?? null
}

export async function searchUsers(meId: string, q: string): Promise<UserSearchResult[]> {
  // Usernames are stored without a leading '@' — strip it so "@test" matches "test".
  const term = q.trim().toLowerCase().replace(/^@+/, '')
  if (term.length < 2) return []
  // Escape SQL LIKE wildcards. Use builder .ilike() (parameterized value) for
  // both columns and merge — never interpolate the term into a raw .or() filter.
  const escaped = term.replace(/[%_\\]/g, (m) => `\\${m}`)
  type ProfileLite = Pick<UserSearchResult, 'id' | 'username' | 'display_name' | 'avatar_url'>
  const [byUsername, byName] = await Promise.all([
    db
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .neq('id', meId)
      .ilike('username', `${escaped}%`)
      .limit(20),
    db
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .neq('id', meId)
      .ilike('display_name', `%${escaped}%`)
      .limit(20),
  ])
  if (byUsername.error) throw byUsername.error
  if (byName.error) throw byName.error
  const merged = new Map<string, ProfileLite>()
  for (const p of [...(byUsername.data ?? []), ...(byName.data ?? [])] as ProfileLite[]) {
    merged.set(p.id, p)
  }
  const blocked = await getBlockRelatedIds(meId)
  const profiles = [...merged.values()].filter((p) => !blocked.has(p.id)).slice(0, 20)
  // Statut d'amitié pour chacun (une requête sur les lignes impliquant meId).
  const { data: rels, error: relErr } = await db
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
  if (relErr) throw relErr
  const rows = (rels ?? []) as FriendshipRow[]
  return profiles.map((p) => {
    const row = rows.find(
      (r) =>
        (r.requester_id === meId && r.addressee_id === p.id) ||
        (r.requester_id === p.id && r.addressee_id === meId)
    )
    return { ...p, status: relationFrom(row ?? null, meId) }
  })
}

// ---------- Social proof for a place ----------

export type FriendLite = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>

export interface PlaceSocialProof {
  saved: FriendLite[]
  visited: FriendLite[]
}

/**
 * Which of the current user's accepted friends have saved and/or visited a
 * given place. Powers the "friends who saved this" row on the place detail.
 */
export async function getPlaceSocialProof(meId: string, osmId: string): Promise<PlaceSocialProof> {
  const empty: PlaceSocialProof = { saved: [], visited: [] }

  const { data: rels, error: relErr } = await db
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
  if (relErr) throw relErr

  const friendIds = (rels ?? []).map((r) =>
    r.requester_id === meId ? r.addressee_id : r.requester_id
  )
  if (friendIds.length === 0) return empty

  const [favs, vis] = await Promise.all([
    db.from('favorites').select('user_id').eq('osm_id', osmId).in('user_id', friendIds),
    db.from('visits').select('user_id').eq('osm_id', osmId).in('user_id', friendIds),
  ])
  if (favs.error) throw favs.error
  if (vis.error) throw vis.error

  const savedIds = [...new Set((favs.data ?? []).map((r) => r.user_id as string))]
  const visitedIds = [...new Set((vis.data ?? []).map((r) => r.user_id as string))]
  const allIds = [...new Set([...savedIds, ...visitedIds])]
  if (allIds.length === 0) return empty

  const { data: profs, error: pErr } = await db
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', allIds)
  if (pErr) throw pErr

  const byId = new Map((profs ?? []).map((p) => [p.id, p as FriendLite]))
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((p): p is FriendLite => !!p)
  return { saved: pick(savedIds), visited: pick(visitedIds) }
}

/**
 * Batch social proof: for many places at once, which friends saved OR visited
 * each. Powers the avatar hint on discovery cards. Returns a map osm_id →
 * friends (max 5 each). One friendships query + one favorites + one visits.
 */
export async function getPlaceSocialProofBatch(
  meId: string,
  osmIds: string[]
): Promise<Record<string, FriendLite[]>> {
  if (osmIds.length === 0) return {}

  const { data: rels, error: relErr } = await db
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
  if (relErr) throw relErr
  const friendIds = (rels ?? []).map((r) =>
    r.requester_id === meId ? r.addressee_id : r.requester_id
  )
  if (friendIds.length === 0) return {}

  const [favs, vis] = await Promise.all([
    db.from('favorites').select('user_id, osm_id').in('osm_id', osmIds).in('user_id', friendIds),
    db.from('visits').select('user_id, osm_id').in('osm_id', osmIds).in('user_id', friendIds),
  ])
  if (favs.error) throw favs.error
  if (vis.error) throw vis.error

  const byPlace = new Map<string, Set<string>>()
  for (const r of [...(favs.data ?? []), ...(vis.data ?? [])]) {
    const osmId = r.osm_id as string
    if (!byPlace.has(osmId)) byPlace.set(osmId, new Set())
    byPlace.get(osmId)!.add(r.user_id as string)
  }
  const allIds = [...new Set([...byPlace.values()].flatMap((s) => [...s]))]
  if (allIds.length === 0) return {}

  const { data: profs, error: pErr } = await db
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', allIds)
  if (pErr) throw pErr
  const byId = new Map((profs ?? []).map((p) => [p.id, p as FriendLite]))

  const out: Record<string, FriendLite[]> = {}
  for (const [osmId, set] of byPlace) {
    const friends = [...set]
      .map((id) => byId.get(id))
      .filter((p): p is FriendLite => !!p)
      .slice(0, 5)
    if (friends.length) out[osmId] = friends
  }
  return out
}

export async function sendFriendRequest(meId: string, otherId: string): Promise<FriendshipStatus> {
  if (meId === otherId) throw new Error('cannot_friend_self')
  const existing = await getFriendshipRow(meId, otherId)
  if (existing) {
    if (existing.status === 'accepted') return 'friends'
    // Une demande inverse en attente → on accepte directement.
    if (existing.requester_id === otherId) {
      await db
        .from('friendships')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', existing.id)
      const me = await getProfile(meId)
      await createNotification(
        otherId,
        meId,
        'friend_accept',
        { username: me?.username },
        me ? `${me.display_name} a accepté ta demande d'ami` : undefined
      )
      return 'friends'
    }
    return 'pending_sent' // déjà envoyée
  }
  const { error } = await db
    .from('friendships')
    .insert({ requester_id: meId, addressee_id: otherId, status: 'pending' })
  if (error) throw error
  const me = await getProfile(meId)
  await createNotification(
    otherId,
    meId,
    'friend_request',
    { username: me?.username },
    me ? `${me.display_name} t'a envoyé une demande d'ami` : undefined
  )
  return 'pending_sent'
}

export async function acceptFriendRequest(meId: string, otherId: string): Promise<boolean> {
  const { data, error } = await db
    .from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('requester_id', otherId)
    .eq('addressee_id', meId)
    .eq('status', 'pending')
    .select('id')
  if (error) throw error
  const ok = (data?.length ?? 0) > 0
  if (ok) {
    const me = await getProfile(meId)
    await createNotification(
      otherId,
      meId,
      'friend_accept',
      { username: me?.username },
      me ? `${me.display_name} a accepté ta demande d'ami` : undefined
    )
  }
  return ok
}

// ---------- Notifications + push ----------

// Envoi push best-effort. Délègue à un webhook (Edge Function / service) que TU
// branches via PUSH_WEBHOOK_URL (+ PUSH_WEBHOOK_SECRET). Sans config → no-op.
// Le webhook reçoit { tokens:[{token,platform}], title, body, data } et parle à FCM/APNs.
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const url = process.env.PUSH_WEBHOOK_URL
  if (!url) return
  try {
    const { data: toks } = await db
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId)
    if (!toks || toks.length === 0) return
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.PUSH_WEBHOOK_SECRET
          ? { Authorization: `Bearer ${process.env.PUSH_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify({ tokens: toks, title, body, data: data ?? {} }),
    })
  } catch (err) {
    console.warn('[sendPushToUser] ignoré', err)
  }
}

// Crée une notif in-app (best-effort) + push. actorText = nom pour le corps du push.
export async function createNotification(
  userId: string,
  actorId: string,
  type: 'friend_request' | 'friend_accept' | 'message',
  data?: Record<string, unknown>,
  pushBody?: string
): Promise<void> {
  if (userId === actorId) return
  try {
    await db
      .from('notifications')
      .insert({ user_id: userId, actor_id: actorId, type, data: data ?? null })
  } catch (err) {
    console.warn('[createNotification] ignoré', err)
  }
  if (pushBody) {
    const title =
      type === 'message'
        ? 'Nouveau message'
        : type === 'friend_request'
          ? "Demande d'ami"
          : 'Forkmap'
    void sendPushToUser(userId, title, pushBody, { type, ...(data ?? {}) })
  }
}

export async function getNotifications(meId: string, limit = 40): Promise<NotificationItem[]> {
  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', meId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  const rows = (data ?? []) as Array<Record<string, unknown>>
  const actorIds = [...new Set(rows.map((r) => r.actor_id as string).filter(Boolean))]
  const byId = new Map<string, unknown>()
  if (actorIds.length > 0) {
    const { data: profs } = await db
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', actorIds)
    for (const p of profs ?? []) byId.set((p as { id: string }).id, p)
  }
  return rows.map((r) => ({
    id: r.id as string,
    type: r.type as NotificationItem['type'],
    data: (r.data as Record<string, unknown>) ?? null,
    read_at: (r.read_at as string) ?? null,
    created_at: r.created_at as string,
    actor: (byId.get(r.actor_id as string) as NotificationItem['actor']) ?? null,
  }))
}

export async function markNotificationsRead(meId: string): Promise<void> {
  await db
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', meId)
    .is('read_at', null)
}

export async function deleteNotification(meId: string, id: string): Promise<void> {
  const { error } = await db.from('notifications').delete().eq('id', id).eq('user_id', meId)
  if (error) throw error
}

// ---------- Blocage ----------

export async function blockUser(meId: string, otherId: string): Promise<void> {
  if (meId === otherId) throw new Error('cannot_block_self')
  const { error } = await db
    .from('blocks')
    .upsert({ blocker_id: meId, blocked_id: otherId }, { onConflict: 'blocker_id,blocked_id' })
  if (error) throw error
  // Bloquer rompt aussi l'amitié.
  await removeFriendship(meId, otherId).catch(() => {})
}

export async function unblockUser(meId: string, otherId: string): Promise<void> {
  const { error } = await db
    .from('blocks')
    .delete()
    .eq('blocker_id', meId)
    .eq('blocked_id', otherId)
  if (error) throw error
}

// Bloqué dans un sens OU l'autre (best-effort : table absente → false).
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  try {
    const { data } = await db
      .from('blocks')
      .select('blocker_id')
      .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`)
      .limit(1)
    return (data?.length ?? 0) > 0
  } catch {
    return false
  }
}

// Tous les ids en relation de blocage avec moi (les 2 sens) — pour filtrer recherche/suggestions.
export async function getBlockRelatedIds(meId: string): Promise<Set<string>> {
  try {
    const { data } = await db
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${meId},blocked_id.eq.${meId}`)
    const s = new Set<string>()
    for (const r of data ?? []) s.add(r.blocker_id === meId ? r.blocked_id : r.blocker_id)
    return s
  } catch {
    return new Set()
  }
}

// Ai-je bloqué cette personne ? (pour l'UI du profil)
export async function hasBlocked(meId: string, otherId: string): Promise<boolean> {
  try {
    const { data } = await db
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', meId)
      .eq('blocked_id', otherId)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

// ---------- Réactions aux messages ----------

export async function toggleReaction(
  meId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  const { data: msg } = await db
    .from('messages')
    .select('sender_id, receiver_id')
    .eq('id', messageId)
    .single()
  if (!msg || (msg.sender_id !== meId && msg.receiver_id !== meId)) throw new Error('forbidden')
  const { data: existing } = await db
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', meId)
    .eq('emoji', emoji)
    .maybeSingle()
  if (existing) {
    await db
      .from('message_reactions')
      .delete()
      .eq('id', (existing as { id: string }).id)
  } else {
    await db.from('message_reactions').insert({ message_id: messageId, user_id: meId, emoji })
  }
}

export async function removeFriendship(meId: string, otherId: string): Promise<void> {
  // Two parameterized deletes (builder .eq()) — never interpolate ids into a
  // raw PostgREST filter string. Covers both directions of the friendship.
  const a = await db
    .from('friendships')
    .delete()
    .eq('requester_id', meId)
    .eq('addressee_id', otherId)
  if (a.error) throw a.error
  const b = await db
    .from('friendships')
    .delete()
    .eq('requester_id', otherId)
    .eq('addressee_id', meId)
  if (b.error) throw b.error
}

export async function getFriends(meId: string): Promise<Profile[]> {
  const { data, error } = await db
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
  if (error) throw error
  const ids = (data ?? []).map((r) => (r.requester_id === meId ? r.addressee_id : r.requester_id))
  if (ids.length === 0) return []
  const { data: profs, error: pErr } = await db.from('profiles').select('*').in('id', ids)
  if (pErr) throw pErr
  return (profs ?? []) as Profile[]
}

// IDs des amis acceptés (les 2 sens).
export async function getFriendIds(userId: string): Promise<string[]> {
  const { data, error } = await db
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  if (error) throw error
  return (data ?? []).map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id))
}

// Nombre d'amis en commun entre deux utilisateurs.
export async function countMutualFriends(meId: string, otherId: string): Promise<number> {
  const [a, b] = await Promise.all([getFriendIds(meId), getFriendIds(otherId)])
  const setB = new Set(b)
  return a.filter((id) => setB.has(id) && id !== meId && id !== otherId).length
}

// « Personnes que tu connais peut-être » : amis de mes amis, pas encore reliés à moi,
// triés par nombre d'amis en commun.
export async function getFriendSuggestions(
  meId: string
): Promise<Array<Profile & { mutuals: number }>> {
  const myFriends = await getFriendIds(meId)
  if (myFriends.length === 0) return []
  // Exclure : moi + toute relation existante (amis + demandes en cours, 2 sens).
  const { data: rels } = await db
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
  const excluded = new Set<string>([meId])
  for (const r of rels ?? []) {
    excluded.add(r.requester_id === meId ? r.addressee_id : r.requester_id)
  }
  for (const id of await getBlockRelatedIds(meId)) excluded.add(id)
  // Arêtes d'amitié impliquant l'un de mes amis.
  const list = myFriends.join(',')
  const { data: fof, error } = await db
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.in.(${list}),addressee_id.in.(${list})`)
  if (error) throw error
  const mutualCount = new Map<string, number>()
  const friendSet = new Set(myFriends)
  for (const r of fof ?? []) {
    // Le bout qui n'est PAS l'un de mes amis est un candidat ; +1 ami en commun.
    const cand = friendSet.has(r.requester_id) ? r.addressee_id : r.requester_id
    if (excluded.has(cand)) continue
    mutualCount.set(cand, (mutualCount.get(cand) ?? 0) + 1)
  }
  const ids = [...mutualCount.keys()]
  if (ids.length === 0) return []
  const { data: profs } = await db.from('profiles').select('*').in('id', ids)
  const out = (profs ?? []).map((p) => ({
    ...(p as Profile),
    mutuals: mutualCount.get((p as Profile).id) ?? 1,
  }))
  out.sort((a, b) => b.mutuals - a.mutuals)
  return out.slice(0, 12)
}

export async function getFriendRequests(meId: string): Promise<FriendRequests> {
  const { data, error } = await db
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'pending')
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
  if (error) throw error
  const rows = (data ?? []) as Array<Pick<FriendshipRow, 'requester_id' | 'addressee_id'>>
  const receivedIds = rows.filter((r) => r.addressee_id === meId).map((r) => r.requester_id)
  const sentIds = rows.filter((r) => r.requester_id === meId).map((r) => r.addressee_id)
  const allIds = [...new Set([...receivedIds, ...sentIds])]
  if (allIds.length === 0) return { received: [], sent: [] }
  const { data: profs, error: pErr } = await db.from('profiles').select('*').in('id', allIds)
  if (pErr) throw pErr
  const byId = new Map((profs ?? []).map((p) => [(p as Profile).id, p as Profile]))
  return {
    received: receivedIds.map((id) => byId.get(id)).filter(Boolean) as Profile[],
    sent: sentIds.map((id) => byId.get(id)).filter(Boolean) as Profile[],
  }
}

// ---------- Fil d'activité (amis) ----------

// Best-effort : n'échoue jamais (si la table n'existe pas encore, on ignore).
export async function recordActivity(
  userId: string,
  e: {
    type: 'favorite' | 'visit' | 'list'
    osm_id?: string | null
    place_name?: string | null
    cuisine?: string | null
    rating?: number | null
    list_name?: string | null
  }
): Promise<void> {
  try {
    await db.from('activity_events').insert({
      user_id: userId,
      type: e.type,
      osm_id: e.osm_id ?? null,
      place_name: e.place_name ?? null,
      cuisine: e.cuisine ?? null,
      rating: e.rating ?? null,
      list_name: e.list_name ?? null,
    })
  } catch (err) {
    console.warn('[recordActivity] ignoré', err)
  }
}

export async function getFriendActivity(meId: string, limit = 40): Promise<ActivityItem[]> {
  const friendIds = await getFriendIds(meId)
  const authors = [meId, ...friendIds]
  const { data, error } = await db
    .from('activity_events')
    .select('*')
    .in('user_id', authors)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  const rows = (data ?? []) as Array<Record<string, unknown>>
  const ids = [...new Set(rows.map((r) => r.user_id as string))]
  if (ids.length === 0) return []
  const { data: profs } = await db
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', ids)
  const byId = new Map((profs ?? []).map((p) => [(p as { id: string }).id, p]))
  return rows
    .map((r) => {
      const actor = byId.get(r.user_id as string) as ActivityItem['actor'] | undefined
      if (!actor) return null
      return {
        id: r.id as string,
        type: r.type as ActivityItem['type'],
        created_at: r.created_at as string,
        osm_id: (r.osm_id as string) ?? null,
        place_name: (r.place_name as string) ?? null,
        cuisine: (r.cuisine as string) ?? null,
        rating: (r.rating as number) ?? null,
        list_name: (r.list_name as string) ?? null,
        actor,
      } as ActivityItem
    })
    .filter(Boolean) as ActivityItem[]
}

// ---------- Public profile bundle (Amis — Étape B) ----------

export async function countFriends(userId: string): Promise<number> {
  const { count, error } = await db
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  if (error) throw error
  return count ?? 0
}

export async function getPublicLists(userId: string): Promise<PublicListCard[]> {
  const { data, error } = await db
    .from('lists')
    .select('id, name, color_hue, list_items(count)')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row: unknown) => {
    const l = row as Record<string, unknown>
    return {
      id: l.id as string,
      name: l.name as string,
      color_hue: l.color_hue as number,
      item_count: (l.list_items as { count: number }[])?.[0]?.count ?? 0,
    }
  })
}

export async function getPublicProfileBundle(
  meId: string,
  username: string
): Promise<PublicProfileBundle | null> {
  const profile = await getProfileByUsername(username)
  if (!profile) return null

  const [row, friends_count, lists, mutuals, blocked] = await Promise.all([
    getFriendshipRow(meId, profile.id),
    countFriends(profile.id),
    getPublicLists(profile.id),
    meId === profile.id ? Promise.resolve(0) : countMutualFriends(meId, profile.id),
    meId === profile.id ? Promise.resolve(false) : hasBlocked(meId, profile.id),
  ])

  // Agrégat lieux + cuisines depuis les items des listes publiques (données publiques).
  // Lieux distincts par osm_id (un même lieu dans 2 listes ne compte qu'une fois).
  const placeIds = new Set<string>()
  const cuisines = new Set<string>()
  const listIds = lists.map((l) => l.id)
  if (listIds.length > 0) {
    const { data: items, error } = await db
      .from('list_items')
      .select('osm_id, place_snapshot')
      .in('list_id', listIds)
    if (error) throw error
    for (const it of items ?? []) {
      const row = it as { osm_id?: string; place_snapshot?: Record<string, unknown> }
      if (typeof row.osm_id === 'string') placeIds.add(row.osm_id)
      const c = row.place_snapshot?.cuisine
      if (typeof c === 'string' && c.trim()) cuisines.add(c.trim().toLowerCase())
    }
  }
  const places = placeIds.size

  return {
    profile,
    status: relationFrom(row, meId),
    friends_count,
    mutuals,
    blocked,
    stats: { lists: lists.length, places, cuisines: cuisines.size },
    lists,
  }
}

// ---------- Messages ----------

export async function sendMessage(
  fromId: string,
  toId: string,
  content: string,
  type: 'text' | 'place' | 'poll' = 'text',
  payload?: unknown,
  replyTo?: string | null
): Promise<MessageRow> {
  if (fromId === toId) throw new Error('cannot_message_self')
  if (await isBlockedBetween(fromId, toId)) throw new Error('blocked')
  const rel = await getFriendshipRow(fromId, toId)
  if (!rel || rel.status !== 'accepted') throw new Error('not_friends')
  const { data, error } = await db
    .from('messages')
    .insert({
      sender_id: fromId,
      receiver_id: toId,
      content,
      type,
      payload: payload ?? null,
      reply_to: replyTo ?? null,
    })
    .select()
    .single()
  if (error) throw error
  const from = await getProfile(fromId)
  const pref = await getConversationPref(toId, fromId) // le destinataire a-t-il coupé cette conv ?
  if (from && !pref.muted) {
    const snippet =
      type === 'place'
        ? 'a partagé un lieu'
        : type === 'poll'
          ? 'a partagé un sondage'
          : content.slice(0, 60)
    await createNotification(
      toId,
      fromId,
      'message',
      { username: from.username },
      `${from.display_name} : ${snippet}`
    )
  }
  return data as MessageRow
}

// Préférences de conversation (best-effort : table absente → valeurs neutres).
export async function getConversationPref(
  meId: string,
  otherId: string
): Promise<{ muted: boolean; cleared_at: string | null }> {
  try {
    const { data } = await db
      .from('conversation_prefs')
      .select('muted, cleared_at')
      .eq('user_id', meId)
      .eq('other_id', otherId)
      .maybeSingle()
    return { muted: !!data?.muted, cleared_at: (data?.cleared_at as string) ?? null }
  } catch {
    return { muted: false, cleared_at: null }
  }
}

async function getConversationPrefs(
  meId: string
): Promise<Map<string, { muted: boolean; cleared_at: string | null }>> {
  const m = new Map<string, { muted: boolean; cleared_at: string | null }>()
  try {
    const { data } = await db
      .from('conversation_prefs')
      .select('other_id, muted, cleared_at')
      .eq('user_id', meId)
    for (const r of data ?? []) {
      const row = r as { other_id: string; muted: boolean; cleared_at: string | null }
      m.set(row.other_id, { muted: !!row.muted, cleared_at: row.cleared_at ?? null })
    }
  } catch {
    /* table absente → prefs vides */
  }
  return m
}

export async function getThread(meId: string, otherId: string, limit = 100): Promise<MessageRow[]> {
  const { data, error } = await db
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${meId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${meId})`
    )
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  let rows = (data ?? []) as MessageRow[]
  const pref = await getConversationPref(meId, otherId)
  if (pref.cleared_at) rows = rows.filter((m) => m.created_at > pref.cleared_at!)

  // Réactions (best-effort : table absente → on ignore).
  try {
    const ids = rows.map((r) => r.id)
    if (ids.length > 0) {
      const { data: reacts } = await db
        .from('message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', ids)
      const agg = new Map<string, Map<string, { count: number; mine: boolean }>>()
      for (const r of (reacts ?? []) as {
        message_id: string
        user_id: string
        emoji: string
      }[]) {
        const perMsg = agg.get(r.message_id) ?? new Map()
        agg.set(r.message_id, perMsg)
        const e = perMsg.get(r.emoji) ?? { count: 0, mine: false }
        e.count++
        if (r.user_id === meId) e.mine = true
        perMsg.set(r.emoji, e)
      }
      rows = rows.map((r) => {
        const perMsg = agg.get(r.id)
        return perMsg
          ? { ...r, reactions: [...perMsg.entries()].map(([emoji, v]) => ({ emoji, ...v })) }
          : r
      })
    }
  } catch {
    /* table absente */
  }
  return rows
}

export async function editMessage(
  meId: string,
  messageId: string,
  content: string
): Promise<MessageRow> {
  const { data: existing } = await db
    .from('messages')
    .select('sender_id, deleted_at')
    .eq('id', messageId)
    .single()
  if (!existing || existing.sender_id !== meId) throw new Error('forbidden')
  if (existing.deleted_at) throw new Error('deleted')
  const { data, error } = await db
    .from('messages')
    .update({ content, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .select()
    .single()
  if (error) throw error
  return data as MessageRow
}

export async function deleteMessage(meId: string, messageId: string): Promise<void> {
  const { data: existing } = await db
    .from('messages')
    .select('sender_id')
    .eq('id', messageId)
    .single()
  if (!existing || existing.sender_id !== meId) throw new Error('forbidden')
  const { error } = await db
    .from('messages')
    .update({ deleted_at: new Date().toISOString(), content: '', payload: null })
    .eq('id', messageId)
  if (error) throw error
}

export async function setConversationMuted(
  meId: string,
  otherId: string,
  muted: boolean
): Promise<void> {
  const { error } = await db
    .from('conversation_prefs')
    .upsert(
      { user_id: meId, other_id: otherId, muted, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,other_id' }
    )
  if (error) throw error
}

// « Supprimer la conversation pour moi » — masque les messages jusqu'à maintenant.
export async function clearConversation(meId: string, otherId: string): Promise<void> {
  const { error } = await db.from('conversation_prefs').upsert(
    {
      user_id: meId,
      other_id: otherId,
      cleared_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,other_id' }
  )
  if (error) throw error
}

export async function markThreadRead(meId: string, otherId: string): Promise<void> {
  const { error } = await db
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('receiver_id', meId)
    .eq('sender_id', otherId)
    .is('read_at', null)
  if (error) throw error
}

export async function getConversations(meId: string): Promise<ConversationSummary[]> {
  // Tous les messages me concernant, du plus récent au plus ancien.
  const { data, error } = await db
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${meId},receiver_id.eq.${meId}`)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  const rows = (data ?? []) as MessageRow[]
  const prefs = await getConversationPrefs(meId)

  // Regrouper par partenaire ; garder le plus récent visible + compter les non-lus.
  const byPartner = new Map<string, { last: MessageRow; unread: number }>()
  for (const m of rows) {
    const partner = m.sender_id === meId ? m.receiver_id : m.sender_id
    const cleared = prefs.get(partner)?.cleared_at
    if (cleared && m.created_at <= cleared) continue // effacée pour moi
    const entry = byPartner.get(partner)
    if (!entry) {
      byPartner.set(partner, {
        last: m,
        unread: m.receiver_id === meId && !m.read_at ? 1 : 0,
      })
    } else if (m.receiver_id === meId && !m.read_at) {
      entry.unread += 1
    }
  }
  const partnerIds = [...byPartner.keys()]
  if (partnerIds.length === 0) return []
  const { data: profs, error: pErr } = await db.from('profiles').select('*').in('id', partnerIds)
  if (pErr) throw pErr
  const profById = new Map((profs ?? []).map((p) => [(p as Profile).id, p as Profile]))

  return partnerIds
    .map((id) => {
      const e = byPartner.get(id)!
      const user = profById.get(id)
      if (!user) return null
      return {
        user,
        last_message: e.last.deleted_at
          ? 'Message supprimé'
          : e.last.type === 'place'
            ? '📍 Lieu partagé'
            : e.last.content,
        last_at: e.last.created_at,
        last_from_me: e.last.sender_id === meId,
        unread: e.unread,
        muted: prefs.get(id)?.muted ?? false,
      }
    })
    .filter((c): c is ConversationSummary => c !== null)
    .sort((a, b) => (a.last_at < b.last_at ? 1 : -1))
}

// ---------- Group polls ("où on mange ce soir ?") ----------

/** Create a poll with 2–6 place options. Returns the new poll id. */
export async function createPoll(
  ownerId: string,
  title: string,
  places: PlaceCard[]
): Promise<{ id: string }> {
  const { data: poll, error } = await db
    .from('polls')
    .insert({ owner_id: ownerId, title })
    .select('id')
    .single()
  if (error) throw error
  const pollId = (poll as { id: string }).id

  const rows = places.map((p, i) => ({
    poll_id: pollId,
    osm_id: p.osm_id,
    place_snapshot: p,
    position: i,
  }))
  const { error: optErr } = await db.from('poll_options').insert(rows)
  if (optErr) throw optErr
  return { id: pollId }
}

/** Public poll view: options (snapshots) + aggregated results. null if absent. */
export async function getPollPublic(pollId: string): Promise<PollPublic | null> {
  const { data: poll, error } = await db
    .from('polls')
    .select('id, title, closed, owner_id')
    .eq('id', pollId)
    .maybeSingle()
  if (error) throw error
  if (!poll) return null
  const p = poll as { id: string; title: string; closed: boolean; owner_id: string }

  const { data: opts, error: optErr } = await db
    .from('poll_options')
    .select('id, place_snapshot, position')
    .eq('poll_id', pollId)
    .order('position', { ascending: true })
  if (optErr) throw optErr

  const { data: votes, error: voteErr } = await db
    .from('poll_votes')
    .select('option_id')
    .eq('poll_id', pollId)
  if (voteErr) throw voteErr

  const options = (opts ?? []).map((o) => {
    const row = o as { id: string; place_snapshot: PlaceCard }
    return { id: row.id, place: row.place_snapshot }
  })
  const results = tallyVotes(
    options.map((o) => o.id),
    (votes ?? []) as { option_id: string }[]
  )
  return { id: p.id, title: p.title, closed: p.closed, owner_id: p.owner_id, options, results }
}

/** Cast (or change) an anonymous vote. Throws 'closed' if the poll is closed,
 *  'invalid_option' if the option doesn't belong to the poll. */
export async function castVote(
  pollId: string,
  optionId: string,
  voterToken: string,
  voterName?: string | null
): Promise<void> {
  const { data: poll, error } = await db
    .from('polls')
    .select('closed')
    .eq('id', pollId)
    .maybeSingle()
  if (error) throw error
  if (!poll) throw new Error('not_found')
  if ((poll as { closed: boolean }).closed) throw new Error('closed')

  // Guard: the option must belong to this poll.
  const { data: opt, error: optErr } = await db
    .from('poll_options')
    .select('id')
    .eq('id', optionId)
    .eq('poll_id', pollId)
    .maybeSingle()
  if (optErr) throw optErr
  if (!opt) throw new Error('invalid_option')

  const { error: upErr } = await db.from('poll_votes').upsert(
    {
      poll_id: pollId,
      option_id: optionId,
      voter_token: voterToken,
      voter_name: voterName ?? null,
    },
    { onConflict: 'poll_id,voter_token' }
  )
  if (upErr) throw upErr
}

/** The option this voter picked, or null. */
export async function getMyVote(pollId: string, voterToken: string): Promise<string | null> {
  const { data, error } = await db
    .from('poll_votes')
    .select('option_id')
    .eq('poll_id', pollId)
    .eq('voter_token', voterToken)
    .maybeSingle()
  if (error) throw error
  return data ? (data as { option_id: string }).option_id : null
}

/** Close a poll (owner only). Returns false if not owned / not found. */
export async function closePoll(pollId: string, ownerId: string): Promise<boolean> {
  const { data, error } = await db
    .from('polls')
    .update({ closed: true })
    .eq('id', pollId)
    .eq('owner_id', ownerId)
    .select('id')
    .maybeSingle()
  if (error) throw error
  return !!data
}

/** The creator's polls, newest first, with total vote counts. */
export async function getMyPolls(ownerId: string): Promise<PollSummary[]> {
  const { data: polls, error } = await db
    .from('polls')
    .select('id, title, closed, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = (polls ?? []) as Omit<PollSummary, 'total'>[]
  if (rows.length === 0) return []

  const { data: votes, error: voteErr } = await db
    .from('poll_votes')
    .select('poll_id')
    .in(
      'poll_id',
      rows.map((r) => r.id)
    )
  if (voteErr) throw voteErr
  const counts = new Map<string, number>()
  for (const v of votes ?? []) {
    const id = (v as { poll_id: string }).poll_id
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return rows.map((r) => ({ ...r, total: counts.get(r.id) ?? 0 }))
}
