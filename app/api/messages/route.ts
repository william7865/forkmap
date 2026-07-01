import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { sendMessage } from '@/lib/db'

const SendSchema = z.object({
  toUserId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
})

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = SendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Message invalide.' }, { status: 400 })

  try {
    const msg = await sendMessage(auth.userId, parsed.data.toUserId, parsed.data.content)
    return NextResponse.json({ data: msg }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'not_friends') {
      return NextResponse.json({ error: 'Vous devez être amis pour discuter.' }, { status: 403 })
    }
    console.error('[POST /api/messages]', err)
    return NextResponse.json({ error: "Impossible d'envoyer le message." }, { status: 500 })
  }
}
