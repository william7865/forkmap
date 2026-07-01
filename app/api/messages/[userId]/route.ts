import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getThread, markThreadRead } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const limited = rateLimit(req, { limit: 120, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { userId } = await params
  if (!z.string().uuid().safeParse(userId).success)
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })

  try {
    const messages = await getThread(auth.userId, userId)
    return NextResponse.json({ data: messages })
  } catch (err) {
    console.error('[GET /api/messages/[userId]]', err)
    return NextResponse.json({ error: 'Impossible de charger la conversation.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const limited = rateLimit(req, { limit: 120, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { userId } = await params
  if (!z.string().uuid().safeParse(userId).success)
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })

  try {
    await markThreadRead(auth.userId, userId)
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error('[PATCH /api/messages/[userId]]', err)
    return NextResponse.json({ error: 'Action impossible.' }, { status: 500 })
  }
}
