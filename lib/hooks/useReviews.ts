'use client'
// ============================================================
// lib/hooks/useReviews.ts
// Loads community reviews for a place and lets the signed-in user
// submit/remove their own. Photos upload client-side to Supabase
// Storage (native → residential IP), then only URLs hit the API.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaceCard, ReviewSummary, UserReview } from '@/types'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { resizeImage } from '@/lib/images'
import { computeSummary } from '@/lib/reviews'
import { isNativeRuntime } from '@/lib/native/platform'

const EMPTY_SUMMARY: ReviewSummary = { count: 0, average: 0 }

interface SubmitInput {
  rating: number
  text: string
  /** New photos to upload (Blobs). Existing URLs to keep are in `keepUrls`. */
  newPhotos: Blob[]
  keepUrls: string[]
}

export interface UseReviews {
  reviews: UserReview[]
  summary: ReviewSummary
  loading: boolean
  /** The current user's own review, if any. */
  myReview: UserReview | null
  submit: (input: SubmitInput) => Promise<boolean>
  remove: () => Promise<boolean>
}

/** Upload photo blobs to the reviews bucket, return their public URLs. */
async function uploadPhotos(osmId: string, blobs: Blob[]): Promise<string[]> {
  if (blobs.length === 0) return []
  const sb = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) throw new Error('not_authenticated')

  const safeOsm = osmId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const urls: string[] = []
  for (let i = 0; i < blobs.length; i++) {
    const resized = await resizeImage(blobs[i], 1280)
    // Unique per upload so re-reviews don't collide (index alone would overwrite).
    const path = `${user.id}/${safeOsm}/${i}-${resized.size}.jpg`
    const { error } = await sb.storage
      .from('reviews')
      .upload(path, resized, { upsert: true, contentType: 'image/jpeg' })
    if (error) throw new Error(error.message)
    const { data } = sb.storage.from('reviews').getPublicUrl(path)
    urls.push(data.publicUrl)
  }
  return urls
}

export function useReviews(place: PlaceCard | null, myUserId: string | null): UseReviews {
  const osmId = place?.osm_id ?? null
  const [reviews, setReviews] = useState<UserReview[]>([])
  const [summary, setSummary] = useState<ReviewSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(false)
  const reqId = useRef(0)
  // Latest selected place — guards optimistic updates from a slow submit/remove
  // landing after the user switched to another place (PlaceDetail isn't remounted).
  const currentOsmId = useRef(osmId)
  currentOsmId.current = osmId

  useEffect(() => {
    // Community reviews are an app-only feature — never fetch/render on web.
    if (!osmId || !isNativeRuntime()) {
      setReviews([])
      setSummary(EMPTY_SUMMARY)
      return
    }
    const id = ++reqId.current
    setLoading(true)
    apiFetch(`/api/reviews?osm_id=${encodeURIComponent(osmId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { data: UserReview[]; summary: ReviewSummary }) => {
        if (id !== reqId.current) return // stale — a newer place was selected
        setReviews(json.data ?? [])
        setSummary(json.summary ?? EMPTY_SUMMARY)
      })
      .catch(() => {
        if (id !== reqId.current) return
        setReviews([])
        setSummary(EMPTY_SUMMARY)
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false)
      })
  }, [osmId])

  const myReview = myUserId ? (reviews.find((r) => r.user_id === myUserId) ?? null) : null

  const submit = useCallback(
    async (input: SubmitInput): Promise<boolean> => {
      if (!place || !osmId || !myUserId) return false
      try {
        const uploaded = await uploadPhotos(osmId, input.newPhotos)
        const photo_urls = [...input.keepUrls, ...uploaded].slice(0, 4)
        const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
        const res = await apiFetch('/api/reviews', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            osm_id: osmId,
            rating: input.rating,
            text: input.text.trim() || null,
            photo_urls,
            place_snapshot: place,
          }),
        })
        if (!res.ok) return false
        const { data } = (await res.json()) as { data: UserReview }
        // Skip the optimistic update if the user has since switched places.
        if (currentOsmId.current === osmId) {
          setReviews((prev) => {
            const next = [data, ...prev.filter((r) => r.user_id !== myUserId)]
            setSummary(computeSummary(next))
            return next
          })
        }
        return true
      } catch {
        return false
      }
    },
    [place, osmId, myUserId]
  )

  const remove = useCallback(async (): Promise<boolean> => {
    if (!osmId || !myUserId) return false
    try {
      const headers = await getAuthHeaders()
      const res = await apiFetch(`/api/reviews?osm_id=${encodeURIComponent(osmId)}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) return false
      if (currentOsmId.current === osmId) {
        setReviews((prev) => {
          const next = prev.filter((r) => r.user_id !== myUserId)
          setSummary(computeSummary(next))
          return next
        })
      }
      return true
    } catch {
      return false
    }
  }, [osmId, myUserId])

  return { reviews, summary, loading, myReview, submit, remove }
}
