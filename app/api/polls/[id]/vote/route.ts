import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { castVote } from '@/lib/db'
import { resolveVoter, voterCookieOptions, VOTER_COOKIE } from '@/lib/vote-token'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VoteSchema = z.object({
  optionId: z.string().uuid(),
  // Legacy field. The server derives identity from its own signed cookie; this
  // is only honoured when no cookie reaches us (native WebView, cross-origin).
  voterToken: z.string().min(1).max(80).optional(),
  voterName: z.string().max(40).nullable().optional(),
})

// Public — no auth. Anonymous link voting.
//
// Dedup is by `voter_token`, which the server now issues and signs, so it can no
// longer be forged. A script can still drop the cookie and be handed a fresh
// identity, so the cap below is what actually makes stuffing expensive: the
// rate-limit key contains the pathname, hence it is per poll as well as per IP.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const burst = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (burst) return burst

  // 15/hour, per IP, per poll. A group poll is often decided from one office or
  // one flat, so several honest voters share an address; the ceiling has to fit
  // them. It still turns "stuff a thousand votes" into a slow, visible grind.
  const stuffing = rateLimit(req, {
    limit: 15,
    windowMs: 3_600_000,
    bucket: 'stuffing',
    message: 'Trop de votes depuis ce réseau pour ce sondage. Réessaie plus tard.',
  })
  if (stuffing) return stuffing

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 })
  }
  const body = await req.json().catch(() => null)
  const parsed = VoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Vote invalide.' }, { status: 400 })
  }

  const voter = resolveVoter(req, parsed.data.voterToken)

  try {
    await castVote(id, parsed.data.optionId, voter.token, parsed.data.voterName ?? null)
    const res = NextResponse.json({ ok: true })
    if (voter.cookieValue) res.cookies.set(VOTER_COOKIE, voter.cookieValue, voterCookieOptions())
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'closed') {
      return NextResponse.json({ error: 'Ce sondage est clôturé.' }, { status: 409 })
    }
    if (msg === 'invalid_option' || msg === 'not_found') {
      return NextResponse.json({ error: 'Sondage ou option introuvable.' }, { status: 404 })
    }
    console.error('[POST /api/polls/[id]/vote]', err)
    return NextResponse.json({ error: "Impossible d'enregistrer ton vote." }, { status: 500 })
  }
}
