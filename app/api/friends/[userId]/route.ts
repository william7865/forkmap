import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { removeFriendship } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { userId } = await params
  if (!z.string().uuid().safeParse(userId).success) {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
  }

  try {
    await removeFriendship(auth.userId, userId)
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error('[DELETE /api/friends/[userId]]', err)
    return NextResponse.json({ error: 'Action impossible.' }, { status: 500 })
  }
}
