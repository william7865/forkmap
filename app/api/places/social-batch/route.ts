// ============================================================
// app/api/places/social-batch/route.ts — POST /api/places/social-batch
// Which friends saved/visited each of many places (avatar hint on cards).
// Body: { osm_ids: string[] }  → { data: { [osm_id]: FriendLite[] } }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getPlaceSocialProofBatch } from '@/lib/db'

const BodySchema = z.object({
  osm_ids: z.array(z.string()).max(80),
})

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
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
    return NextResponse.json({ error: 'osm_ids invalides' }, { status: 400 })
  }

  try {
    const data = await getPlaceSocialProofBatch(auth.userId, parsed.data.osm_ids)
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[POST /api/places/social-batch]', err)
    return NextResponse.json(
      { error: 'Impossible de charger l’activité des amis.' },
      { status: 500 }
    )
  }
}
