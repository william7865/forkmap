import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { toggleReaction } from '@/lib/db'

const Schema = z.object({ emoji: z.string().min(1).max(8) })

// Ajoute/retire une réaction emoji (toggle).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 120, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })

  try {
    await toggleReaction(auth.userId, id, parsed.data.emoji)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'forbidden')
      return NextResponse.json({ error: 'Action non autorisée.' }, { status: 403 })
    console.error('[POST /api/messages/item/react]', err)
    return NextResponse.json({ error: 'Échec.' }, { status: 500 })
  }
}
