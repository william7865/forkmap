// ============================================================
// app/api/places/enrich/route.ts — POST /api/places/enrich
// Rate limiting added: 20 requests/min per IP.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { enrichPlaces } from '@/lib/foursquare'
import { rateLimit } from '@/lib/rate-limit'
import type { EnrichApiResponse, PlaceBase } from '@/types'

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
  // Matches REST_BATCH in useRestaurants — lowering it below the client's batch
  // size would 400 every enrichment request.
  places: z.array(PlaceBaseSchema).max(30, 'Max 30 places per request'),
})

export async function POST(req: NextRequest): Promise<NextResponse<EnrichApiResponse>> {
  // Public by design (signed-out visitors still see ratings). Each place spends
  // Foursquare quota, so: small batch, tight burst, hourly ceiling per address.
  // Raises the cost of abuse without removing it — see enrich-google for the
  // full reasoning. Results are cached per place for an hour.
  // One map move issues ~7 batches, so the burst window must fit several moves.
  const burst = rateLimit(req, { limit: 20, windowMs: 60_000 })
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

  const { places } = parsed.data as { places: PlaceBase[] }

  if (!process.env.FOURSQUARE_API_KEY) {
    return NextResponse.json({
      data: places.map((p) => ({ ...p })),
      enriched_count: 0,
      cached_count: 0,
    })
  }

  try {
    const enriched = await enrichPlaces(places)
    const enrichedCount = enriched.filter((p) => p.fsq != null).length

    return NextResponse.json({
      data: enriched,
      enriched_count: enrichedCount,
      cached_count: places.length - enrichedCount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/places/enrich] Error:', message)
    return NextResponse.json({ error: `Enrichment failed: ${message}` }, { status: 502 })
  }
}
