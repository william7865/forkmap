// ============================================================
// lib/hooks/useDetailEnrichment.ts
//
// Fetch-on-open enrichment for a single place detail.
//
// The map only enriches places in batches while browsing, and a place the user
// opens may not have been reached, so its card can lack photos, rating and
// hours. This hook fills that gap for the one place on screen, using the source
// that actually returns data:
//
//   • Native → enrichPlacesViaScrape (Google via the device's residential IP).
//   • Web    → POST /api/places/enrich-google. Google blocks Vercel's datacenter
//              IP, so this degrades to nothing — by design, and without error.
//
// Wikidata is NOT refetched here: the enrich-osm batch already pulls it for
// wikidata-tagged places, and it returns nothing for the rest, so there is
// nothing to gain. The detail simply renders what the place already carries.
//
// The hook never mutates the global map state. It returns a locally merged copy,
// so a concurrent map update cannot be clobbered by a stale detail snapshot.
// ============================================================

import { useEffect, useState } from 'react'
import type { PlaceCard } from '@/types'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { canScrapeOnDevice, enrichPlacesViaScrape } from '@/lib/google-client'

/** Merge fetched fields onto a place without ever overwriting a value with empty. */
function mergeFsq(base: PlaceCard, fetched: PlaceCard | undefined): PlaceCard {
  if (!fetched?.fsq) return base
  return { ...base, fsq: fetched.fsq, fsq_rating: fetched.fsq.rating ?? base.fsq_rating }
}

/**
 * Returns the place enriched on open. Starts as the passed-in place and upgrades
 * in place once Google data arrives (native, or web when unblocked).
 */
export function useDetailEnrichment(place: PlaceCard): PlaceCard {
  const [enriched, setEnriched] = useState<PlaceCard>(place)

  // Keep the local copy in step with the prop without discarding what we fetched.
  // A different place → replace outright (never flash the previous one's photos).
  // The SAME place re-created by the parent (e.g. a favourite toggle) → fold the
  // prop's fields in, but keep our fetched fsq if the new prop lacks it.
  useEffect(() => {
    setEnriched((prev) =>
      prev.osm_id === place.osm_id
        ? { ...place, fsq: place.fsq ?? prev.fsq, fsq_rating: place.fsq_rating ?? prev.fsq_rating }
        : place
    )
  }, [place])

  useEffect(() => {
    // Already has photos → nothing to fetch.
    if (place.fsq?.photos?.length) return

    const controller = new AbortController()
    let cancelled = false

    void (async () => {
      try {
        if (canScrapeOnDevice()) {
          const [done] = await enrichPlacesViaScrape([place])
          if (!cancelled) setEnriched((prev) => mergeFsq(prev, done))
          return
        }
        const res = await apiFetch('/api/places/enrich-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
          body: JSON.stringify({ places: [place] }),
          signal: controller.signal,
        })
        if (!res.ok) return
        const { data } = (await res.json()) as { data?: PlaceCard[] }
        if (!cancelled) setEnriched((prev) => mergeFsq(prev, data?.[0]))
      } catch {
        // Network error or aborted: keep whatever the card already had.
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
    // osm_id, not the object identity: a re-render with a new object for the same
    // place must not re-trigger the scrape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.osm_id])

  return enriched
}
