import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { createPoll, getMyPolls } from '@/lib/db'
import type { PlaceCard } from '@/types'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  try {
    const polls = await getMyPolls(auth.userId)
    return NextResponse.json({ data: polls })
  } catch (err) {
    console.error('[GET /api/polls]', err)
    return NextResponse.json({ error: 'Impossible de charger tes sondages.' }, { status: 500 })
  }
}

// Place snapshots are full PlaceCards; validate the essentials, pass the rest through.
const PlaceSnapshotSchema = z
  .object({ osm_id: z.string().min(1), name: z.string().min(1) })
  .passthrough()

const CreatePollSchema = z.object({
  title: z.string().min(1).max(80),
  places: z.array(PlaceSnapshotSchema).min(2).max(6),
})

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = CreatePollSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Il faut un titre et 2 à 6 restaurants.' }, { status: 400 })
  }

  try {
    const poll = await createPoll(
      auth.userId,
      parsed.data.title,
      parsed.data.places as unknown as PlaceCard[]
    )
    return NextResponse.json({ data: poll }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/polls]', err)
    return NextResponse.json({ error: 'Impossible de créer le sondage.' }, { status: 500 })
  }
}
