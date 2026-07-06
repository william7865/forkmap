// ============================================================
// lib/hooks/useRestaurants.ts — v4
//   ROOT CAUSE FIX: favoriteIds starts as new Set() on every
//   mount. When the user navigates to /favorites and back, the
//   hook re-mounts and loses all in-memory state, making every
//   place show is_favorite: false — even though the DB is fine.
//
//   FIX: useEffect on mount fetches /api/favorites and
//   pre-populates favoriteIds + re-annotates any already-loaded
//   places so hearts appear immediately on return.
// ============================================================
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { PlaceCard, FilterState, PlaceBase, FavoriteRow } from '@/types'
import { annotateDistances, annotateScores, applyFilters } from '@/lib/scoring'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { canScrapeOnDevice, enrichPlacesViaScrape } from '@/lib/google-client'
import { heavyTap } from '@/lib/native/haptics'
import { pullCloudNotes } from '@/components/place/NoteModal'

interface BBox {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
  centerLat: number
  centerLon: number
}

/**
 * Get the Authorization header for the current session.
 * Returns { Authorization: "Bearer <token>" } or {} if not logged in.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const sb = getSupabaseBrowserClient()
    const {
      data: { session },
    } = await sb.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  } catch {
    return {}
  }
}

const REFETCH_THRESHOLD = 0.004

function bboxChanged(prev: BBox | null, next: BBox): boolean {
  if (!prev) return true
  return (
    Math.abs(prev.minLon - next.minLon) > REFETCH_THRESHOLD ||
    Math.abs(prev.minLat - next.minLat) > REFETCH_THRESHOLD ||
    Math.abs(prev.maxLon - next.maxLon) > REFETCH_THRESHOLD ||
    Math.abs(prev.maxLat - next.maxLat) > REFETCH_THRESHOLD
  )
}

export function useRestaurants() {
  const [places, setPlaces] = useState<PlaceCard[]>([])
  const [filteredPlaces, setFilteredPlaces] = useState<PlaceCard[]>([])
  const [loading, setLoading] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  const currentFilters = useRef<FilterState>({ sortBy: 'score' })
  const lastBbox = useRef<BBox | null>(null)
  const fetchCount = useRef(0)
  // Ref mirror of favoriteIds — lets fetchRestaurants read the latest value
  // without being in its dependency array, preventing a new function reference
  // (and thus a spurious re-fetch) on every favorite toggle.
  const favoriteIdsRef = useRef<Set<string>>(new Set())
  // Ref mirror of places — lets applyClientFilters read the latest places value
  // without taking a [places] dep that would create a new callback on every batch.
  const placesRef = useRef<PlaceCard[]>([])
  // AbortController ref — cancels in-flight fetches when a new one starts,
  // preventing wasted FSQ quota on stale map positions.
  const abortRef = useRef<AbortController | null>(null)

  // Keep ref in sync with state
  // (state is still needed for re-render; ref is for stable closure reads)
  const updateFavoriteIds = (ids: Set<string>) => {
    favoriteIdsRef.current = ids
    setFavoriteIds(ids)
  }

  // ── Restore favourites from DB on every mount ──────────────
  // Next.js navigation unmounts/remounts this hook, clearing the
  // in-memory Set. This effect restores it from the API so that
  // hearts survive /favorites → / navigation.
  useEffect(() => {
    let cancelled = false

    // Sync personal notes from the cloud into the local cache (self-gates on auth).
    void pullCloudNotes()

    getAuthHeaders().then((authHeaders) => {
      if (cancelled) return
      apiFetch('/api/favorites', { headers: authHeaders })
        .then((r) => {
          // 401 = not logged in — completely normal, just skip silently
          if (r.status === 401) return null
          return r.ok ? r.json() : null
        })
        .then((data: { data?: FavoriteRow[] } | null) => {
          if (cancelled || !data?.data) return

          const ids = new Set(data.data.map((row) => row.osm_id))

          updateFavoriteIds(ids)

          // Re-annotate places already in state (race: map may load before API reply)
          const reannotate = (arr: PlaceCard[]) =>
            arr.length > 0 ? arr.map((p) => ({ ...p, is_favorite: ids.has(p.osm_id) })) : arr

          setPlaces(reannotate)
          setFilteredPlaces(reannotate)
        })
        .catch(() => {
          // Silently ignore — hearts just won't pre-populate if API is down
        })
    })

    return () => {
      cancelled = true
    }
  }, []) // intentionally empty — run once on mount only

  // ── Core fetch ─────────────────────────────────────────────
  const fetchRestaurants = useCallback(async (bbox: BBox) => {
    if (!bboxChanged(lastBbox.current, bbox)) return
    lastBbox.current = bbox

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    const myFetch = ++fetchCount.current
    setLoading(true)
    setError(null)

    try {
      const osmRes = await apiFetch(
        `/api/osm/overpass?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`,
        { signal }
      )
      if (!osmRes.ok) throw new Error(`OSM ${osmRes.status}`)
      const osmData = await osmRes.json()
      const osmPlaces: PlaceBase[] = osmData.data ?? []

      if (fetchCount.current !== myFetch) return
      if (!osmPlaces.length) {
        setPlaces([])
        setFilteredPlaces([])
        setLoading(false)
        return
      }

      const raw = annotateScores(
        annotateDistances(
          osmPlaces.map((p) => ({ ...p, is_favorite: favoriteIdsRef.current.has(p.osm_id) })),
          bbox.centerLat,
          bbox.centerLon
        )
      )
      placesRef.current = raw
      setPlaces(raw)
      setFilteredPlaces(applyFilters(raw, currentFilters.current))
      setLoading(false)
      setEnriching(true)

      // ── Throttled publishing ──
      // The 3-layer enrichment streams ~17 batches; publishing React state on
      // every batch caused a re-render + re-sort storm (list flicker, and the
      // map "freezing" right after a pan triggers a fetch). Coalesce updates to
      // ~1 per 350ms (+ a forced final flush): results still stream in, but
      // smoothly. placesRef is always kept fresh synchronously so other reads
      // (e.g. toggleFavorite) stay correct.
      let publishTimer: ReturnType<typeof setTimeout> | null = null
      let lastPublishAt = 0
      const PUBLISH_MS = 350
      const publish = (next: PlaceCard[], force = false) => {
        if (fetchCount.current !== myFetch) return
        placesRef.current = next
        if (publishTimer) {
          clearTimeout(publishTimer)
          publishTimer = null
        }
        const flush = () => {
          publishTimer = null
          if (fetchCount.current !== myFetch) return
          setPlaces(next)
          setFilteredPlaces(applyFilters(next, currentFilters.current))
          lastPublishAt = Date.now()
        }
        const elapsed = Date.now() - lastPublishAt
        if (force || elapsed >= PUBLISH_MS) flush()
        else publishTimer = setTimeout(flush, PUBLISH_MS - elapsed)
      }

      // ── Step 1: OSM deep enrichment (free, fast — opening hours, features, etc.)
      // Run for all places immediately since it's free and instant
      const OSM_BATCH = 30
      const osmBatches: PlaceBase[][] = chunk(osmPlaces, OSM_BATCH)
      let osmEnriched: PlaceCard[] = [...raw]

      for (const batch of osmBatches) {
        if (fetchCount.current !== myFetch) return
        try {
          const res = await apiFetch('/api/places/enrich-osm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ places: batch, deep: false }),
            signal,
          })
          if (res.ok) {
            const data = await res.json()
            const batchEnriched: PlaceCard[] = data.data ?? batch
            const batchMap = new Map(batchEnriched.map((e) => [e.osm_id, e]))
            osmEnriched = osmEnriched.map((orig) => {
              const found = batchMap.get(orig.osm_id)
              return found
                ? { ...found, is_favorite: favoriteIdsRef.current.has(orig.osm_id) }
                : orig
            })
          }
        } catch {
          /* silently fall back to raw */
        }

        if (fetchCount.current !== myFetch) return
        const scoredOsm = annotateScores(
          annotateDistances(osmEnriched, bbox.centerLat, bbox.centerLon)
        )
        const withFavOsm = scoredOsm.map((p) => ({
          ...p,
          is_favorite: favoriteIdsRef.current.has(p.osm_id),
        }))
        publish(withFavOsm)
      }

      // ── Step 2: Foursquare enrichment (ratings, photos, categories)
      // Only if API key is set. Runs after OSM enrichment.
      const FIRST_BATCH = 20
      const REST_BATCH = 30
      const batches: PlaceBase[][] = [
        osmPlaces.slice(0, FIRST_BATCH),
        ...chunk(osmPlaces.slice(FIRST_BATCH), REST_BATCH),
      ]

      let enriched: PlaceCard[] = [...osmEnriched]

      for (const batch of batches) {
        if (fetchCount.current !== myFetch) return

        try {
          const res = await apiFetch('/api/places/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ places: batch }),
            signal,
          })
          const data = await res.json()
          const fsqBatch: PlaceCard[] = data.data ?? batch
          const fsqMap = new Map(fsqBatch.map((e) => [e.osm_id, e]))
          // Merge FSQ data onto OSM-enriched base
          enriched = enriched.map((orig) => {
            const fsq = fsqMap.get(orig.osm_id)
            if (!fsq) return orig
            return {
              ...orig,
              ...fsq,
              // Keep OSM enrichment — don't let FSQ overwrite it
              osm_enriched: orig.osm_enriched ?? fsq.osm_enriched,
              // Prefer OSM open_now (real-time parsed) over FSQ (may be stale)
              open_now: orig.open_now ?? fsq.open_now,
              // Expose FSQ rating at top level for scoring
              fsq_rating: fsq.fsq?.rating,
              is_favorite: favoriteIdsRef.current.has(orig.osm_id),
            }
          })
        } catch {
          // FSQ failed — keep OSM-enriched data, still better than nothing
        }

        if (fetchCount.current !== myFetch) return
        const enrichedMap = new Map(enriched.map((e) => [e.osm_id, e]))
        const combined = osmPlaces.map((orig) => {
          const found = enrichedMap.get(orig.osm_id)
          return found ?? { ...orig, is_favorite: favoriteIdsRef.current.has(orig.osm_id) }
        })
        const scored = annotateScores(annotateDistances(combined, bbox.centerLat, bbox.centerLon))
        const withFav = scored.map((p) => ({
          ...p,
          is_favorite: favoriteIdsRef.current.has(p.osm_id),
        }))
        publish(withFav)
      }

      // ── Step 3: Google enrichment (rating, photos, hours) via the DIY
      // scraper (or a keyed provider — see lib/google.ts). CAPPED to the top
      // RICH_CAP places by current score: the scraper hits Google directly and
      // must stay light to avoid blocks / burning a provider quota. The route
      // degrades gracefully when no provider is available.
      const RICH_CAP = 10
      const topIds = new Set(
        [...enriched]
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, RICH_CAP)
          .map((p) => p.osm_id)
      )
      const richBatch = osmPlaces.filter((p) => topIds.has(p.osm_id))

      if (richBatch.length && fetchCount.current === myFetch) {
        try {
          // Native scrapes Google straight from the device (residential IP → not
          // blocked). Web falls back to the server route (blocked on Vercel's IP).
          let googleBatch: PlaceCard[]
          if (canScrapeOnDevice()) {
            googleBatch = await enrichPlacesViaScrape(richBatch)
          } else {
            const res = await apiFetch('/api/places/enrich-google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ places: richBatch }),
              signal,
            })
            const data = await res.json()
            googleBatch = data.data ?? richBatch
          }
          const googleMap = new Map(googleBatch.map((e) => [e.osm_id, e]))
          enriched = enriched.map((orig) => {
            const g = googleMap.get(orig.osm_id)
            if (!g?.fsq) return orig
            // Merge Google rich fields onto FSQ/OSM base; keep FSQ categories.
            const mergedFsq = {
              ...orig.fsq,
              ...g.fsq,
              categories: orig.fsq?.categories ?? g.fsq?.categories,
            }
            return {
              ...orig,
              fsq: mergedFsq,
              fsq_rating: mergedFsq.rating ?? orig.fsq_rating,
              open_now: orig.open_now ?? g.open_now,
              is_favorite: favoriteIdsRef.current.has(orig.osm_id),
            }
          })
        } catch {
          // Google failed — keep FSQ/OSM-enriched data, still useful.
        }

        if (fetchCount.current !== myFetch) return
        const gMap = new Map(enriched.map((e) => [e.osm_id, e]))
        const gCombined = osmPlaces.map((orig) => {
          const found = gMap.get(orig.osm_id)
          return found ?? { ...orig, is_favorite: favoriteIdsRef.current.has(orig.osm_id) }
        })
        const gScored = annotateScores(annotateDistances(gCombined, bbox.centerLat, bbox.centerLon))
        const gWithFav = gScored.map((p) => ({
          ...p,
          is_favorite: favoriteIdsRef.current.has(p.osm_id),
        }))
        publish(gWithFav)
      }

      // Final flush — publish the fully-enriched state immediately.
      publish(placesRef.current, true)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return // cancelled, not an error
      if (fetchCount.current === myFetch) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      }
    } finally {
      if (fetchCount.current === myFetch) {
        setLoading(false)
        setEnriching(false)
      }
    }
    // favoriteIdsRef is a ref — stable reference, not a dep.
  }, [])

  // ── Client-side filter ─────────────────────────────────────
  // Uses placesRef (not places state) so this callback has a stable reference —
  // no re-render cascade across consumers on every batch update.
  const applyClientFilters = useCallback((filters: FilterState) => {
    currentFilters.current = filters
    setFilteredPlaces(applyFilters(placesRef.current, filters))
  }, [])

  // ── Favourite toggle ────────────────────────────────────────
  const toggleFavorite = useCallback(
    async (place: PlaceCard): Promise<'ok' | 'auth_required' | 'error'> => {
      const isFav = favoriteIds.has(place.osm_id)

      const flip = (arr: PlaceCard[]) =>
        arr.map((p) => (p.osm_id === place.osm_id ? { ...p, is_favorite: !isFav } : p))

      const revert = (arr: PlaceCard[]) =>
        arr.map((p) => (p.osm_id === place.osm_id ? { ...p, is_favorite: isFav } : p))

      // Optimistic update — both arrays so list re-renders immediately
      const nextIds = new Set<string>(favoriteIds)
      isFav ? nextIds.delete(place.osm_id) : nextIds.add(place.osm_id)
      updateFavoriteIds(nextIds)
      const flippedPlaces = flip(placesRef.current)
      placesRef.current = flippedPlaces
      setPlaces(flippedPlaces)
      setFilteredPlaces(flip)
      heavyTap() // haptic feedback on favorite toggle (no-op on web)

      try {
        const authHeaders = await getAuthHeaders()
        let res: Response
        if (isFav) {
          res = await apiFetch(`/api/favorites/${encodeURIComponent(place.osm_id)}`, {
            method: 'DELETE',
            headers: authHeaders,
          })
        } else {
          res = await apiFetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ place }),
          })
        }

        if (res.status === 401) {
          // Not logged in — rollback optimistic update and signal caller
          const revertIds = new Set<string>(favoriteIds)
          updateFavoriteIds(revertIds)
          const revertedPlaces401 = revert(placesRef.current)
          placesRef.current = revertedPlaces401
          setPlaces(revertedPlaces401)
          setFilteredPlaces(revert)
          return 'auth_required'
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        return 'ok'
      } catch {
        // Rollback on network error
        const revertIds = new Set<string>(favoriteIds)
        updateFavoriteIds(revertIds)
        const revertedPlaces = revert(placesRef.current)
        placesRef.current = revertedPlaces
        setPlaces(revertedPlaces)
        setFilteredPlaces(revert)
        return 'error'
      }
    },
    [favoriteIds]
  )

  return {
    places,
    filteredPlaces,
    loading,
    enriching,
    error,
    fetchRestaurants,
    applyClientFilters,
    favoriteIds,
    toggleFavorite,
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
