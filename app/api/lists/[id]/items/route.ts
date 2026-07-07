import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getListItems, addListItem, getListNotifyMeta, notifyFollowers } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const { id } = await params

  try {
    const items = await getListItems(id, auth.userId)
    return NextResponse.json({ data: items })
  } catch (err) {
    console.error('[GET /api/lists/[id]/items]', err)
    return NextResponse.json({ error: 'Failed to load list items' }, { status: 500 })
  }
}

const AddItemSchema = z.object({
  osm_id: z.string().min(1).max(64),
  place_snapshot: z.record(z.unknown()),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = AddItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  try {
    const item = await addListItem(id, auth.userId, parsed.data.osm_id, parsed.data.place_snapshot)
    // Ping followers when the owner updates their own PUBLIC list (best-effort;
    // only fires if their pref is 'lists').
    const meta = await getListNotifyMeta(id)
    if (meta && meta.is_public && meta.user_id === auth.userId) {
      void notifyFollowers(
        auth.userId,
        'list',
        { list_id: id, list_name: meta.name },
        `a mis à jour sa liste ${meta.name}`
      )
    }
    return NextResponse.json({ data: item }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/lists/[id]/items]', err)
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
  }
}
