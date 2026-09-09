// ============================================================
// GET /api/places/photos?osm_id=node/123
//
// Les photos d'un lieu, récupérées une fois par le scraper maison
// (scripts/scrape-place-photos.mjs) et rangées dans notre stockage.
//
// La source de vérité est le BUCKET lui-même : un dossier par lieu. Pas de
// table à tenir en parallèle, donc rien qui puisse diverger du contenu réel du
// stockage, et aucune migration SQL à exécuter avant de s'en servir.
//
// Route publique : ces photos s'affichent sur des fiches consultables sans
// compte, et elles n'ont rien de personnel.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { cacheGet, cacheSet } from '@/lib/cache'
import { friendlyError } from '@/lib/api-errors'

const BUCKET = 'place-photos'
const CACHE_MS = 6 * 60 * 60 * 1000

/** `node/123` porte un « / », interdit dans un nom de dossier : on l'aplatit. */
function storageKey(osmId: string): string {
  return osmId.replace(/\//g, '_')
}

const QuerySchema = z.object({ osm_id: z.string().min(1).max(128) })

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 120, windowMs: 60_000 })
  if (limited) return limited

  const parsed = QuerySchema.safeParse({
    osm_id: req.nextUrl.searchParams.get('osm_id') ?? '',
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Identifiant de lieu manquant.' }, { status: 400 })
  }

  const key = `place-photos:${parsed.data.osm_id}`
  const cached = cacheGet<string[]>(key)
  if (cached) return NextResponse.json({ data: cached, cached: true })

  try {
    const folder = storageKey(parsed.data.osm_id)
    const { data, error } = await db.storage.from(BUCKET).list(folder, { limit: 12 })
    if (error) throw error

    // Tri par nom : le scraper numérote 1.jpg, 2.jpg… dans l'ordre où Google
    // présente sa galerie, la première étant sa photo de couverture.
    const urls = (data ?? [])
      .filter((f) => f.name.match(/\.(jpg|jpeg|png|webp)$/i))
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
      .map((f) => db.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`).data.publicUrl)

    cacheSet(key, urls, CACHE_MS)
    return NextResponse.json({ data: urls })
  } catch (err) {
    console.error('[GET /api/places/photos]', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}
