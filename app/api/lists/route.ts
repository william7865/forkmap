import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getLists, createList, recordActivity } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  try {
    const lists = await getLists(auth.userId)
    return NextResponse.json({ data: lists })
  } catch (err) {
    console.error('[GET /api/lists]', err)
    return NextResponse.json({ error: 'Failed to load lists' }, { status: 500 })
  }
}

const CreateListSchema = z.object({
  name: z.string().min(1).max(40),
  description: z.string().max(120).nullable().optional(),
  is_public: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = CreateListSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  try {
    const list = await createList(
      auth.userId,
      parsed.data.name,
      parsed.data.description ?? null,
      parsed.data.is_public
    )
    if (parsed.data.is_public) {
      await recordActivity(auth.userId, { type: 'list', list_name: parsed.data.name })
    }
    return NextResponse.json({ data: list }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/lists]', err)
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
  }
}
