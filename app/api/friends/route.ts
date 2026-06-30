import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getFriends, sendFriendRequest } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  try {
    const friends = await getFriends(auth.userId)
    return NextResponse.json({ data: friends })
  } catch (err) {
    console.error('[GET /api/friends]', err)
    return NextResponse.json({ error: 'Impossible de charger les amis.' }, { status: 500 })
  }
}

const RequestSchema = z.object({ userId: z.string().uuid() })

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  if (parsed.data.userId === auth.userId) {
    return NextResponse.json({ error: 'Action impossible.' }, { status: 400 })
  }

  try {
    const status = await sendFriendRequest(auth.userId, parsed.data.userId)
    return NextResponse.json({ data: { status } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/friends]', err)
    return NextResponse.json({ error: "Impossible d'envoyer la demande." }, { status: 500 })
  }
}
