import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { removeListItem } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; osm_id: string }> }
) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const { id, osm_id } = await params

  try {
    await removeListItem(id, auth.userId, decodeURIComponent(osm_id))
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/lists/[id]/items/[osm_id]]', err)
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 })
  }
}
