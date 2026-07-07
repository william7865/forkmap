// ============================================================
// app/api/verification/route.ts
//   GET  /api/verification  → my request status (or null)
//   POST /api/verification {note?, links?} → submit / re-open a request
// Tastemaker verification request (user side). Approval is admin-only.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { friendlyError } from '@/lib/api-errors'
import { createVerificationRequest, getMyVerificationRequest } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  try {
    return NextResponse.json({ data: await getMyVerificationRequest(auth.userId) })
  } catch (err) {
    console.error('[GET /api/verification]', err)
    return NextResponse.json({ error: 'Impossible de charger la demande.' }, { status: 500 })
  }
}

const BodySchema = z.object({
  note: z.string().max(500).nullish(),
  links: z.array(z.string().url()).max(5).optional(),
})

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 5, windowMs: 60_000 })
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

  try {
    const data = await createVerificationRequest(
      auth.userId,
      parsed.data.note?.trim() || null,
      parsed.data.links ?? []
    )
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[POST /api/verification]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}
