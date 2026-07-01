import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getFriendActivity } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  try {
    const activity = await getFriendActivity(auth.userId)
    return NextResponse.json({ data: activity })
  } catch (err) {
    // Table pas encore créée (migration non lancée) → feed vide plutôt qu'une 500.
    console.warn('[GET /api/activity] vide', err)
    return NextResponse.json({ data: [] })
  }
}
