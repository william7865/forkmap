// ============================================================
// app/api/imports/route.ts — GET + POST /api/imports
//
// POST est appelé par la Share Extension iOS : il doit être le plus rapide
// possible (l'utilisateur attend dans TikTok). Il ne fait QUE stocker —
// aucune résolution, aucun appel réseau sortant. L'appareil résout ensuite.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { listImports, createImport } from '@/lib/db'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { friendlyError } from '@/lib/api-errors'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  try {
    return NextResponse.json({ data: await listImports(auth.userId) })
  } catch (err) {
    console.error('[GET /api/imports]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}

const CreateImportSchema = z.object({
  url: z.string().url().max(2048),
  platform: z.enum(['tiktok', 'instagram', 'youtube', 'other']),
  note: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  try {
    const parsed = CreateImportSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Lien invalide.' }, { status: 400 })
    }
    const row = await createImport(auth.userId, parsed.data)
    return NextResponse.json({ data: row }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/imports]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}
