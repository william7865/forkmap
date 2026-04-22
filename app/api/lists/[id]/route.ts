import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { updateList, deleteList } from '@/lib/db'

const PatchSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  description: z.string().max(120).nullable().optional(),
  is_public: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  try {
    const list = await updateList(id, auth.userId, parsed.data)
    return NextResponse.json({ data: list })
  } catch (err) {
    console.error('[PATCH /api/lists/[id]]', err)
    return NextResponse.json({ error: 'Failed to update list' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const { id } = await params

  try {
    await deleteList(id, auth.userId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/lists/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 })
  }
}
