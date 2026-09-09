// ============================================================
// /api/places/photos — les photos d'un lieu, partagées par tous.
//
// GET  ?osm_id=…   → les photos connues pour ce lieu
// POST {osm_id,urls} → dépose ce qu'un appareil vient de récolter
//
// DEUX SOURCES, dans cet ordre :
//   1. Les fichiers rangés par le scraper de lot (lieux enregistrés) — nos
//      propres images, elles ne mourront pas.
//   2. Le CACHE D'URL, alimenté par les appareils qui ouvrent une fiche.
//
// ⚠️ Le cache ne garde QUE des URL, jamais les images : Google les héberge
// déjà. Environ 500 octets par restaurant au lieu de 1,3 Mo — 7 Mo pour tout
// Paris au lieu de 20 Go, donc pas de plan de stockage payant. En échange une
// URL peut mourir, d'où la péremption à un mois.
//
// L'intérêt du partage : le PREMIER utilisateur qui ouvre un restaurant paie
// les cinq secondes de récolte, tous les suivants l'ouvrent instantanément.
//
// La source de vérité reste le bucket : un dossier par lieu, les images d'un
// côté, `urls.json` de l'autre. Pas de table à tenir en parallèle.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { cacheGet, cacheSet } from '@/lib/cache'
import { friendlyError } from '@/lib/api-errors'
import { requireUser } from '@/lib/api-auth'
import { parseCachedPhotos, sanitisePhotoUrls } from '@/lib/place-photos'

const BUCKET = 'place-photos'
const CACHE_FILE = 'urls.json'
const MEM_TTL_MS = 6 * 60 * 60 * 1000

/** `node/123` porte un « / », interdit dans un nom de dossier : on l'aplatit. */
function storageKey(osmId: string): string {
  return osmId.replace(/\//g, '_')
}

const OsmId = z.string().min(1).max(128)

/** Les images rangées par le scraper de lot, s'il en existe. */
async function storedFiles(folder: string): Promise<string[]> {
  const { data, error } = await db.storage.from(BUCKET).list(folder, { limit: 12 })
  if (error || !data) return []
  return (
    data
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f.name))
      // Tri par nom : le scraper numérote 1, 2… dans l'ordre de la galerie
      // Google, la première étant sa photo de couverture.
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
      .map((f) => db.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`).data.publicUrl)
  )
}

/** Les URL déposées par un appareil, si elles sont encore fraîches. */
async function cachedUrls(folder: string): Promise<string[]> {
  const { data, error } = await db.storage.from(BUCKET).download(`${folder}/${CACHE_FILE}`)
  if (error || !data) return []
  try {
    return parseCachedPhotos(JSON.parse(await data.text())) ?? []
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 120, windowMs: 60_000 })
  if (limited) return limited

  const parsed = OsmId.safeParse(req.nextUrl.searchParams.get('osm_id') ?? '')
  if (!parsed.success) {
    return NextResponse.json({ error: 'Identifiant de lieu manquant.' }, { status: 400 })
  }

  const key = `place-photos:${parsed.data}`
  const memo = cacheGet<string[]>(key)
  if (memo) return NextResponse.json({ data: memo, cached: true })

  try {
    const folder = storageKey(parsed.data)
    const urls = (await storedFiles(folder)) ?? []
    const result = urls.length > 0 ? urls : await cachedUrls(folder)
    cacheSet(key, result, MEM_TTL_MS)
    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[GET /api/places/photos]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}

const PostSchema = z.object({
  osm_id: OsmId,
  urls: z.array(z.string().url().max(2048)).max(20),
})

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (limited) return limited

  // Écriture réservée aux comptes : ce cache est partagé par tout le monde,
  // il ne doit pas pouvoir être empoisonné par n'importe qui.
  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const parsed = PostSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Photos invalides.' }, { status: 400 })
  }

  // Seules des URL de photos Google entrent : le champ vient d'un appareil,
  // donc d'une source qu'on ne contrôle pas.
  const urls = sanitisePhotoUrls(parsed.data.urls)
  if (urls.length === 0) {
    return NextResponse.json({ error: 'Photos invalides.' }, { status: 400 })
  }

  try {
    const folder = storageKey(parsed.data.osm_id)
    const body = JSON.stringify({ urls, at: new Date().toISOString() })
    const { error } = await db.storage
      .from(BUCKET)
      .upload(`${folder}/${CACHE_FILE}`, new Blob([body], { type: 'application/json' }), {
        contentType: 'application/json',
        upsert: true,
      })
    if (error) throw error
    // Le cache mémoire porterait sinon l'ancienne réponse vide.
    cacheSet(`place-photos:${parsed.data.osm_id}`, urls, MEM_TTL_MS)
    return NextResponse.json({ ok: true, count: urls.length })
  } catch (err) {
    console.error('[POST /api/places/photos]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}
