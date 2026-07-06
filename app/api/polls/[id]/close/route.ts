import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { closePoll } from '@/lib/db'

// Owner only — lock the poll so no further votes are accepted.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const { id } = await params
  try {
    const ok = await closePoll(id, auth.userId)
    if (!ok) return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/polls/[id]/close]', err)
    return NextResponse.json({ error: 'Impossible de clôturer le sondage.' }, { status: 500 })
  }
}
