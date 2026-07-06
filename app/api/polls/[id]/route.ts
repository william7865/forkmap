import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getPollPublic, getMyVote } from '@/lib/db'

// Public — no auth. Anyone with the link can read a poll and its live tally.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 120, windowMs: 60_000 })
  if (limited) return limited

  const { id } = await params
  const token = req.nextUrl.searchParams.get('token')

  try {
    const poll = await getPollPublic(id)
    if (!poll) return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 })
    const myVote = token ? await getMyVote(id, token) : null
    return NextResponse.json({ data: { poll, myVote } })
  } catch (err) {
    console.error('[GET /api/polls/[id]]', err)
    return NextResponse.json({ error: 'Impossible de charger le sondage.' }, { status: 500 })
  }
}
