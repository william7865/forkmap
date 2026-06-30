import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getPublicProfileBundle } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { username } = await params

  try {
    const bundle = await getPublicProfileBundle(auth.userId, username)
    if (!bundle) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
    return NextResponse.json({ data: bundle })
  } catch (err) {
    console.error('[GET /api/users/[username]/profile]', err)
    return NextResponse.json({ error: 'Impossible de charger le profil.' }, { status: 500 })
  }
}
