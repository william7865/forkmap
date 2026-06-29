import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { getProfileByUsername } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { username } = await params
  try {
    const p = await getProfileByUsername(username)
    if (!p) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({
      data: {
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      },
    })
  } catch (err) {
    console.error('[GET /api/profile/[username]]', err)
    return NextResponse.json({ error: 'Échec du chargement.' }, { status: 500 })
  }
}
