import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getNotifications, markNotificationsRead } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  try {
    const notifications = await getNotifications(auth.userId)
    return NextResponse.json({ data: notifications })
  } catch (err) {
    // Table pas encore créée (migration non lancée) → liste vide plutôt qu'une 500.
    console.warn('[GET /api/notifications] vide', err)
    return NextResponse.json({ data: [] })
  }
}

export async function PATCH(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  try {
    await markNotificationsRead(auth.userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.warn('[PATCH /api/notifications]', err)
    return NextResponse.json({ ok: true })
  }
}
