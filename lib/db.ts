// ============================================================
// lib/db.ts — Supabase client + DB helpers
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type { FavoriteRow, OsmFsqMapping, PlaceCard } from '@/types'

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
}

export interface ListItemRow {
  id: string
  list_id: string
  osm_id: string
  place_snapshot: Record<string, unknown>
  added_at: string
}

// ---------- Lists ----------

export async function getLists(userId: string): Promise<ListRow[]> {
  const { data, error } = await db
    .from('lists')
    .select('*, list_items(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row: unknown) => {
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
    }
  })
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
  const { data: list, error: listErr } = await db
    .from('lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', userId)
    .single()
  if (listErr || !list) throw new Error('Not found or not authorized')

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
  const { data: list } = await db
    .from('lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', userId)
    .single()
  if (!list) throw new Error('Not found or not authorized')

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
  const { data: list } = await db
    .from('lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', userId)
    .single()
  if (!list) throw new Error('Not found or not authorized')

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
