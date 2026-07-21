import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { blockUser, unblockUser } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { userId } = await params
  try {
    await blockUser(auth.userId, userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'cannot_block_self')
      return NextResponse.json({ error: 'Action impossible.' }, { status: 400 })
    console.error('[POST /api/blocks]', err)
    return NextResponse.json({ error: 'Échec du blocage.' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { userId } = await params
  try {
    await unblockUser(auth.userId, userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/blocks]', err)
    return NextResponse.json({ error: 'Échec du déblocage.' }, { status: 500 })
  }
}
