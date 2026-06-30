import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { searchUsers } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.trim().length < 2) return NextResponse.json({ data: [] })

  try {
    const results = await searchUsers(auth.userId, q)
    return NextResponse.json({ data: results })
  } catch (err) {
    console.error('[GET /api/users/search]', err)
    return NextResponse.json({ error: 'Recherche impossible.' }, { status: 500 })
  }
}
