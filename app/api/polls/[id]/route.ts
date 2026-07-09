import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { requireUser } from '@/lib/api-auth'
import { getPollPublic, getMyVote } from '@/lib/db'
import { resolveVoter } from '@/lib/vote-token'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Public — no auth required. Anyone with the link can read a poll and its live
// tally. A bearer token is OPTIONAL: when present it only decides `isOwner`
// (whether to show the "close" control) — the owner's user id is never exposed.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 120, windowMs: 60_000 })
  if (limited) return limited

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 })
  }
  // Identity comes from the signed cookie. `?token=` survives only for the
  // native WebView, whose cross-origin request carries no cookie.
  const { token } = resolveVoter(req, req.nextUrl.searchParams.get('token'))

  try {
    const poll = await getPollPublic(id)
    if (!poll) return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 })

    // Optional identity: derive isOwner without ever returning owner_id.
    const auth = await requireUser(req)
    const meId = 'userId' in auth ? auth.userId : null
    const { owner_id, ...rest } = poll
    const publicPoll = { ...rest, isOwner: meId != null && meId === owner_id }

    const myVote = token ? await getMyVote(id, token) : null
    return NextResponse.json({ data: { poll: publicPoll, myVote } })
  } catch (err) {
    console.error('[GET /api/polls/[id]]', err)
    return NextResponse.json({ error: 'Impossible de charger le sondage.' }, { status: 500 })
  }
}
