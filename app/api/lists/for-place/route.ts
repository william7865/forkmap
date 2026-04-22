import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getListsForPlace } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 120, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const osmId = new URL(req.url).searchParams.get('osm_id')
  if (!osmId) {
    return NextResponse.json({ error: 'Missing osm_id' }, { status: 400 })
  }

  try {
    const listIds = await getListsForPlace(auth.userId, osmId)
    return NextResponse.json({ data: listIds })
  } catch (err) {
    console.error('[GET /api/lists/for-place]', err)
    return NextResponse.json({ error: 'Failed to check lists' }, { status: 500 })
  }
}
