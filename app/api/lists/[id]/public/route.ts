import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getPublicListWithItems } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { id } = await params

  try {
    const detail = await getPublicListWithItems(id)
    if (!detail) return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })
    return NextResponse.json({ data: detail })
  } catch (err) {
    console.error('[GET /api/lists/[id]/public]', err)
    return NextResponse.json({ error: 'Impossible de charger la liste.' }, { status: 500 })
  }
}
