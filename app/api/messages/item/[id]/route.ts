import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { editMessage, deleteMessage } from '@/lib/db'

const EditSchema = z.object({ content: z.string().trim().min(1).max(2000) })

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = EditSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Message invalide.' }, { status: 400 })

  try {
    const msg = await editMessage(auth.userId, id, parsed.data.content)
    return NextResponse.json({ data: msg })
  } catch (err) {
    if (err instanceof Error && err.message === 'forbidden')
      return NextResponse.json({ error: 'Action non autorisée.' }, { status: 403 })
    if (err instanceof Error && err.message === 'deleted')
      return NextResponse.json({ error: 'Message supprimé.' }, { status: 409 })
    console.error('[PATCH /api/messages/item]', err)
    return NextResponse.json({ error: 'Échec de la modification.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { id } = await params

  try {
    await deleteMessage(auth.userId, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'forbidden')
      return NextResponse.json({ error: 'Action non autorisée.' }, { status: 403 })
    console.error('[DELETE /api/messages/item]', err)
    return NextResponse.json({ error: 'Échec de la suppression.' }, { status: 500 })
  }
}
