import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { deleteNotification } from '@/lib/db'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { id } = await params
  try {
    await deleteNotification(auth.userId, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/notifications/[id]]', err)
    return NextResponse.json({ error: 'Échec de la suppression.' }, { status: 500 })
  }
}
