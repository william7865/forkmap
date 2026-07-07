// ============================================================
// app/api/reviews/route.ts
//   GET    /api/reviews?osm_id=…            → public: reviews + { count, average }
//   POST   /api/reviews {osm_id, rating, …} → requireUser: upsert own review
//   DELETE /api/reviews?osm_id=…            → requireUser: delete own review
// Community reviews (rating + text + up to 4 photos). Photos are uploaded to
// Supabase Storage client-side; only their public URLs are stored here.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { friendlyError } from '@/lib/api-errors'
import { db, getReviews, upsertReview, deleteReview } from '@/lib/db'
import { computeSummary, REVIEW_TEXT_MAX, REVIEW_PHOTOS_MAX } from '@/lib/reviews'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const osmId = req.nextUrl.searchParams.get('osm_id')
  if (!osmId) return NextResponse.json({ error: 'osm_id requis' }, { status: 400 })

  try {
    const reviews = await getReviews(osmId)
    return NextResponse.json({ data: reviews, summary: computeSummary(reviews) })
  } catch (err) {
    console.error('[GET /api/reviews]', err)
    return NextResponse.json({ error: 'Impossible de charger les avis.' }, { status: 500 })
  }
}

// Only accept photo URLs that live in our own Supabase Storage reviews bucket —
// never store arbitrary externally-hosted URLs.
const STORAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/reviews/`
const photoUrlSchema = z
  .string()
  .url()
  .refine((u) => u.startsWith(STORAGE_PREFIX), 'URL de photo invalide')

const BodySchema = z.object({
  osm_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(REVIEW_TEXT_MAX).nullish(),
  photo_urls: z.array(photoUrlSchema).max(REVIEW_PHOTOS_MAX).optional(),
  // A serialized PlaceCard snapshot — bound its size so a client can't bloat the
  // table with multi-MB JSON blobs.
  place_snapshot: z
    .record(z.unknown())
    .refine((v) => JSON.stringify(v).length <= 20_000, 'snapshot trop volumineux')
    .optional(),
})

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join('; ') },
      { status: 400 }
    )
  }

  const { osm_id, rating, text, photo_urls, place_snapshot } = parsed.data
  try {
    const { review, orphanedPhotos } = await upsertReview(auth.userId, {
      osm_id,
      rating,
      text: text?.trim() ? text.trim() : null,
      photo_urls: photo_urls ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      place_snapshot: place_snapshot as any,
    })
    // Free photos dropped by an edit (best-effort — never fail the write on it).
    await cleanupStoragePhotos(orphanedPhotos)
    return NextResponse.json({ data: review })
  } catch (err) {
    console.error('[POST /api/reviews]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}

/**
 * Turn a public Storage URL into its object path (uid/osm/idx.jpg) for removal.
 * Only accepts our own bucket prefix and rejects path traversal, so a crafted
 * URL can never reach outside the reviews bucket.
 */
function storagePath(url: string): string | null {
  if (!url.startsWith(STORAGE_PREFIX)) return null
  const path = url.slice(STORAGE_PREFIX.length)
  if (!path || path.includes('..')) return null
  return path
}

/** Best-effort removal of review photos from Storage; logs but never throws. */
async function cleanupStoragePhotos(urls: string[]): Promise<void> {
  const paths = urls.map(storagePath).filter((p): p is string => !!p)
  if (paths.length === 0) return
  const { error } = await db.storage.from('reviews').remove(paths)
  if (error) console.warn('[api/reviews] storage cleanup', error.message)
}

export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const osmId = req.nextUrl.searchParams.get('osm_id')
  if (!osmId) return NextResponse.json({ error: 'osm_id requis' }, { status: 400 })

  try {
    const removedPhotos = await deleteReview(auth.userId, osmId)
    await cleanupStoragePhotos(removedPhotos)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/reviews]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}
