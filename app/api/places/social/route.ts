// ============================================================
// app/api/places/social/route.ts — GET /api/places/social?osm_id=…
// Which of the current user's friends saved / visited this place.
// osm_id carries a slash ("node/123") → passed as a query param, not a path.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getPlaceSocialProof } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const osmId = req.nextUrl.searchParams.get('osm_id')
  if (!osmId) {
    return NextResponse.json({ error: 'osm_id requis' }, { status: 400 })
  }

  try {
    const data = await getPlaceSocialProof(auth.userId, osmId)
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/places/social]', err)
    return NextResponse.json(
      { error: 'Impossible de charger l’activité des amis.' },
      { status: 500 }
    )
  }
}
