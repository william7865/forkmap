import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { setConversationMuted, clearConversation } from '@/lib/db'

const MuteSchema = z.object({ muted: z.boolean() })

// Rendre muet / réactiver une conversation.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { userId } = await params

  const body = await req.json().catch(() => null)
  const parsed = MuteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })

  try {
    await setConversationMuted(auth.userId, userId, parsed.data.muted)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/conversations/[userId]]', err)
    return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
  }
}

// Supprimer la conversation (pour moi).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { userId } = await params

  try {
    await clearConversation(auth.userId, userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/conversations/[userId]]', err)
    return NextResponse.json({ error: 'Échec de la suppression.' }, { status: 500 })
  }
}
