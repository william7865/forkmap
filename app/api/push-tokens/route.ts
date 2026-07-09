// app/api/push-tokens/route.ts — POST /api/push-tokens
// Registers (or refreshes) a device push token for the current user.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { savePushToken } from '@/lib/db'

const PushTokenSchema = z.object({
  token: z.string().min(1).max(512),
  platform: z.enum(['ios', 'android', 'web']),
})

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { userId } = auth as { userId: string; error: null }

  const body = await req.json().catch(() => null)
  const parsed = PushTokenSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'token and platform required' }, { status: 400 })
  }

  try {
    await savePushToken(userId, parsed.data.token, parsed.data.platform)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save token' },
      { status: 500 }
    )
  }
}
