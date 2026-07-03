// ============================================================
// app/api/notes/route.ts
//   GET  /api/notes           → all personal notes for the user (sync)
//   PUT  /api/notes {osm_id, text} → upsert (empty text → delete)
// Personal notes used to live in localStorage only; this syncs them.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { getNotes, upsertNote, deleteNote } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  try {
    return NextResponse.json({ data: await getNotes(auth.userId) })
  } catch (err) {
    console.error('[GET /api/notes]', err)
    return NextResponse.json({ error: 'Impossible de charger les notes.' }, { status: 500 })
  }
}

const BodySchema = z.object({
  osm_id: z.string().min(1),
  text: z.string().max(500),
})

export async function PUT(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
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
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join('; ') },
      { status: 400 }
    )
  }

  const { osm_id, text } = parsed.data
  try {
    if (text.trim()) await upsertNote(auth.userId, osm_id, text.trim())
    else await deleteNote(auth.userId, osm_id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/notes]', err)
    return NextResponse.json({ error: 'Impossible d’enregistrer la note.' }, { status: 500 })
  }
}
