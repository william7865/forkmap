import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { acceptFriendRequest } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { userId } = await params
  if (!z.string().uuid().safeParse(userId).success) {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
  }

  try {
    const accepted = await acceptFriendRequest(auth.userId, userId)
    return NextResponse.json({ data: { accepted } })
  } catch (err) {
    console.error('[POST /api/friends/[userId]/accept]', err)
    return NextResponse.json({ error: "Impossible d'accepter la demande." }, { status: 500 })
  }
}
