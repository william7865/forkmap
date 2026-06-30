import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getFriendRequests } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  try {
    const requests = await getFriendRequests(auth.userId)
    return NextResponse.json({ data: requests })
  } catch (err) {
    console.error('[GET /api/friends/requests]', err)
    return NextResponse.json({ error: 'Impossible de charger les demandes.' }, { status: 500 })
  }
}
