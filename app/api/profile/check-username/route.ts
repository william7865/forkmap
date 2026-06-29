import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { validateUsername } from '@/lib/username'
import { isUsernameAvailable } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const u = req.nextUrl.searchParams.get('u') ?? ''
  const v = validateUsername(u)
  if (!v.ok) return NextResponse.json({ available: false, reason: v.reason })
  try {
    const available = await isUsernameAvailable(v.username)
    return NextResponse.json({ available, reason: available ? undefined : 'Déjà pris.' })
  } catch (err) {
    console.error('[GET /api/profile/check-username]', err)
    return NextResponse.json({ error: 'Erreur de vérification.' }, { status: 500 })
  }
}
