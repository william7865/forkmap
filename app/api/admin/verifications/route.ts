// ============================================================
// app/api/admin/verifications/route.ts   (ADMIN ONLY)
//   GET  /api/admin/verifications              → pending requests + profiles
//   POST /api/admin/verifications {request_id, decision, reviewer_note?}
// Gated by ADMIN_USER_IDS (env allowlist). Approval flips profiles.verified.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { friendlyError } from '@/lib/api-errors'
import { isAdmin } from '@/lib/admin'
import { getPendingVerificationRequests, decideVerification } from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error
  if (!isAdmin(auth.userId)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  try {
    return NextResponse.json({ data: await getPendingVerificationRequests() })
  } catch (err) {
    console.error('[GET /api/admin/verifications]', err)
    return NextResponse.json({ error: 'Impossible de charger les demandes.' }, { status: 500 })
  }
}

const BodySchema = z.object({
  request_id: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  reviewer_note: z.string().max(500).nullish(),
})

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error
  if (!isAdmin(auth.userId)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  try {
    await decideVerification(
      parsed.data.request_id,
      parsed.data.decision,
      parsed.data.reviewer_note?.trim() || null
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/admin/verifications]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}
