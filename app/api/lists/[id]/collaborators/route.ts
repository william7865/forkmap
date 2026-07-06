import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { addCollaborator, removeCollaborator, getCollaborators, canEditList } from '@/lib/db'

// List a list's collaborators — owner or collaborator may read.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { id } = await params

  try {
    if (!(await canEditList(id, auth.userId))) {
      return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })
    }
    const collaborators = await getCollaborators(id)
    return NextResponse.json({ data: collaborators })
  } catch (err) {
    console.error('[GET /api/lists/[id]/collaborators]', err)
    return NextResponse.json(
      { error: 'Impossible de charger les collaborateurs.' },
      { status: 500 }
    )
  }
}

const AddSchema = z.object({ friendId: z.string().uuid() })

// Owner invites a friend as collaborator.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = AddSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })

  try {
    await addCollaborator(auth.userId, id, parsed.data.friendId)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'not_owner')
      return NextResponse.json({ error: 'Seul le créateur peut inviter.' }, { status: 403 })
    if (msg === 'not_friends')
      return NextResponse.json({ error: 'Vous devez être amis.' }, { status: 403 })
    if (msg === 'cannot_add_self')
      return NextResponse.json({ error: 'Action impossible.' }, { status: 400 })
    console.error('[POST /api/lists/[id]/collaborators]', err)
    return NextResponse.json({ error: "Impossible d'ajouter le collaborateur." }, { status: 500 })
  }
}

// Owner removes a collaborator (?userId=).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  const { id } = await params

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId requis.' }, { status: 400 })

  try {
    await removeCollaborator(auth.userId, id, userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'not_owner')
      return NextResponse.json({ error: 'Seul le créateur peut retirer.' }, { status: 403 })
    console.error('[DELETE /api/lists/[id]/collaborators]', err)
    return NextResponse.json({ error: 'Impossible de retirer le collaborateur.' }, { status: 500 })
  }
}
