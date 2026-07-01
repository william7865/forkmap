import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getFriendSuggestions } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  try {
    const suggestions = await getFriendSuggestions(auth.userId)
    return NextResponse.json({ data: suggestions })
  } catch (err) {
    console.error('[GET /api/friends/suggestions]', err)
    return NextResponse.json({ error: 'Impossible de charger les suggestions.' }, { status: 500 })
  }
}
