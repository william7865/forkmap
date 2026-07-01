import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { validateUsername } from '@/lib/username'
import {
  getProfile,
  createProfile,
  updateProfile,
  isUsernameAvailable,
  UsernameLockedError,
} from '@/lib/db'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error
  try {
    const profile = await getProfile(auth.userId)
    if (!profile) return NextResponse.json({ error: 'no_profile' }, { status: 404 })
    return NextResponse.json({ data: profile })
  } catch (err) {
    console.error('[GET /api/profile]', err)
    return NextResponse.json({ error: 'Échec du chargement du profil.' }, { status: 500 })
  }
}

const CreateSchema = z.object({
  username: z.string().min(1),
  display_name: z.string().min(1).max(40),
  avatar_url: z.string().url().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })

  const v = validateUsername(parsed.data.username)
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 })

  try {
    if (!(await isUsernameAvailable(v.username)))
      return NextResponse.json({ error: 'username_taken' }, { status: 409 })
    const profile = await createProfile(auth.userId, {
      username: v.username,
      display_name: parsed.data.display_name,
      avatar_url: parsed.data.avatar_url ?? null,
    })
    return NextResponse.json({ data: profile }, { status: 201 })
  } catch (err) {
    // Unique-violation race: the username was taken between check and insert.
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    )
      return NextResponse.json({ error: 'username_taken' }, { status: 409 })
    console.error('[POST /api/profile]', err)
    return NextResponse.json({ error: 'Échec de la création du profil.' }, { status: 500 })
  }
}

const PatchSchema = z.object({
  display_name: z.string().min(1).max(40).optional(),
  avatar_url: z.string().url().nullable().optional(),
  username: z.string().min(1).optional(),
  bio: z.string().max(200).nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000 })
  if (limited) return limited
  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })

  const patch: {
    display_name?: string
    avatar_url?: string | null
    username?: string
    bio?: string | null
  } = {}
  if (parsed.data.display_name !== undefined) patch.display_name = parsed.data.display_name
  if (parsed.data.avatar_url !== undefined) patch.avatar_url = parsed.data.avatar_url
  if (parsed.data.bio !== undefined) patch.bio = parsed.data.bio
  if (parsed.data.username !== undefined) {
    const v = validateUsername(parsed.data.username)
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 })
    patch.username = v.username
  }

  try {
    // Only reject if it's a DIFFERENT username that's already taken (keeping
    // your own username is a no-op, handled in updateProfile).
    if (patch.username !== undefined) {
      const current = await getProfile(auth.userId)
      if (
        current &&
        patch.username !== current.username &&
        !(await isUsernameAvailable(patch.username))
      )
        return NextResponse.json({ error: 'username_taken' }, { status: 409 })
    }
    const profile = await updateProfile(auth.userId, patch)
    return NextResponse.json({ data: profile })
  } catch (err) {
    if (err instanceof UsernameLockedError)
      return NextResponse.json(
        { error: 'username_locked', nextChangeAt: err.nextChangeAt },
        { status: 409 }
      )
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    )
      return NextResponse.json({ error: 'username_taken' }, { status: 409 })
    console.error('[PATCH /api/profile]', err)
    return NextResponse.json({ error: 'Échec de la mise à jour du profil.' }, { status: 500 })
  }
}
