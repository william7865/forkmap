// ============================================================
// app/api/follows/route.ts
//   POST   /api/follows {followee_id}   → follow a user
//   DELETE /api/follows?followee_id=…   → unfollow
// Unilateral follow (tastemakers). requireUser; a user only manages their own edges.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { friendlyError } from '@/lib/api-errors'
import { followUser, unfollowUser } from '@/lib/db'

const BodySchema = z.object({ followee_id: z.string().uuid() })

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 40, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
  }
  if (parsed.data.followee_id === auth.userId) {
    return NextResponse.json({ error: 'On ne peut pas se suivre soi-même.' }, { status: 400 })
  }

  try {
    await followUser(auth.userId, parsed.data.followee_id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/follows]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, { limit: 40, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const followeeId = req.nextUrl.searchParams.get('followee_id')
  if (!followeeId) return NextResponse.json({ error: 'followee_id requis' }, { status: 400 })

  try {
    await unfollowUser(auth.userId, followeeId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/follows]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}
