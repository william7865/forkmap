import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { castVote } from '@/lib/db'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VoteSchema = z.object({
  optionId: z.string().uuid(),
  voterToken: z.string().min(1).max(80),
  voterName: z.string().max(40).nullable().optional(),
})

// Public — no auth. Anonymous link voting, deduped by voterToken.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 })
  }
  const body = await req.json().catch(() => null)
  const parsed = VoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Vote invalide.' }, { status: 400 })
  }

  try {
    await castVote(id, parsed.data.optionId, parsed.data.voterToken, parsed.data.voterName ?? null)
    return NextResponse.json({ ok: true })
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
