// ============================================================
// app/api/tastemakers/feed/route.ts
//   GET /api/tastemakers/feed → recent reviews from people I follow
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getTastemakerFeed } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  try {
    return NextResponse.json({ data: await getTastemakerFeed(auth.userId) })
  } catch (err) {
    console.error('[GET /api/tastemakers/feed]', err)
    return NextResponse.json({ error: 'Impossible de charger le fil.' }, { status: 500 })
  }
}
