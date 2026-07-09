// ============================================================
// app/api/places/enrich-google/route.ts — POST /api/places/enrich-google
// Google Places (New) enrichment. Rate-limited: 20 requests/min per IP.
// Mirrors /api/places/enrich (Foursquare). Gracefully degrades (returns
// places unchanged) when GOOGLE_PLACES_API_KEY is absent.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { enrichPlacesGoogle, richProviderConfigured } from '@/lib/google'
import { rateLimit } from '@/lib/rate-limit'
import type { EnrichApiResponse, PlaceCard } from '@/types'

const PlaceBaseSchema = z.object({
  osm_id: z.string(),
  osm_type: z.enum(['node', 'way', 'relation']),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  tags: z.record(z.string()),
  cuisine: z.string().optional(),
  opening_hours: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  open_now: z.boolean().optional(),
})

const BodySchema = z.object({
  places: z.array(PlaceBaseSchema).max(25, 'Max 25 places per request'),
})

export async function POST(req: NextRequest): Promise<NextResponse<EnrichApiResponse>> {
  // Public by design: browsing the map without an account must still show
  // ratings. Each place can cost a billed provider call, so the batch is small,
  // bursts are tight, and an hourly ceiling caps what one address can spend.
  // This raises the cost of abuse; it does not eliminate it. A determined
  // attacker with many addresses still burns quota — the durable answer is
  // requiring an account, which would take ratings away from signed-out
  // visitors. Per-place results are cached for an hour, which is what keeps
  // normal browsing far below these limits.
  const burst = rateLimit(req, { limit: 10, windowMs: 60_000 })
  if (burst) return burst

  const limited = rateLimit(req, { limit: 200, windowMs: 3_600_000, bucket: 'hourly' })
  if (limited) return limited

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

  const places = parsed.data.places as PlaceCard[]

  // Graceful degradation: no provider configured → return places untouched.
  if (!richProviderConfigured()) {
    return NextResponse.json({
      data: places,
      enriched_count: 0,
      cached_count: 0,
    })
  }

  try {
    const enriched = await enrichPlacesGoogle(places)
    const enrichedCount = enriched.filter((p) => p.fsq?.rating != null).length

    return NextResponse.json({
      data: enriched,
      enriched_count: enrichedCount,
      cached_count: places.length - enrichedCount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/places/enrich-google] Error:', message)
    return NextResponse.json({ error: `Google enrichment failed: ${message}` }, { status: 502 })
  }
}
