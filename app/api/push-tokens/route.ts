// app/api/push-tokens/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth.error) {
    return auth.error
  }

  const body = await req.json().catch(() => null)
  const token: string = body?.token
  const platform: string = body?.platform

  if (!token || !platform) {
    return NextResponse.json({ error: 'token and platform required' }, { status: 400 })
  }

  if (!['ios', 'android', 'web'].includes(platform)) {
    return NextResponse.json({ error: 'invalid platform' }, { status: 400 })
  }

  const sb = getServiceClient()
  const { error } = await sb
    .from('push_tokens')
    .upsert(
      { user_id: auth.userId, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
