// ============================================================
// app/api/imports/[id]/route.ts — PATCH + DELETE /api/imports/[id]
//
// PATCH est appelé par l'APPAREIL après résolution (métadonnées du post,
// resto retenu, candidats), ou par l'UI (note, choix d'un candidat).
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateImport, deleteImport } from '@/lib/db'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { friendlyError } from '@/lib/api-errors'
import type { ImportRow } from '@/types'

const CandidateSchema = z.object({
  osm_id: z.string().max(64).optional(),
  name: z.string().min(1).max(255),
  context: z.string().max(255),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  rating: z.number().optional(),
})

const PatchImportSchema = z
  .object({
    status: z.enum(['pending', 'resolved', 'ambiguous', 'failed']).optional(),
    note: z.string().max(500).nullable().optional(),
    post_title: z.string().max(500).nullable().optional(),
    post_caption: z.string().max(3000).nullable().optional(),
    post_author: z.string().max(120).nullable().optional(),
    post_thumb: z.string().url().max(2048).nullable().optional(),
    osm_id: z.string().max(64).nullable().optional(),
    place_snapshot: z.record(z.unknown()).nullable().optional(),
    candidates: z.array(CandidateSchema).max(3).nullable().optional(),
    resolved_at: z.string().datetime().nullable().optional(),
  })
  .strict()

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  try {
    const { id } = await ctx.params
    const parsed = PatchImportSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Mise à jour invalide.' }, { status: 400 })
    }
    // place_snapshot is validated as a loose record (Zod can't type-check the
    // full PlaceCard shape) — it flows through opaquely, same as favorites'
    // snapshot column, so a cast is needed here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await updateImport(auth.userId, id, parsed.data as any as Partial<ImportRow>)
    return NextResponse.json({ data: row })
  } catch (err) {
    console.error('[PATCH /api/imports/[id]]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  try {
    const { id } = await ctx.params
    await deleteImport(auth.userId, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/imports/[id]]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}
