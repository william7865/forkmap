// ============================================================
// lib/import/thumb-store.ts — copie la vignette d'un post chez nous.
//
// ⚠️ SERVEUR UNIQUEMENT : importe le client service-role de lib/db.
//
// Voir lib/import/thumb.ts pour le pourquoi : les URL des CDN TikTok et
// Instagram sont signées et expirent, donc l'adresse ne se stocke pas. On
// télécharge l'image tant qu'elle répond, on la range dans notre bucket, et
// c'est cette adresse-là qu'on garde.
//
// La fonction ne jette jamais : une vignette est un agrément, pas une
// condition. Un import doit aboutir même si le CDN refuse l'image.
// ============================================================

import { db } from '@/lib/db'
import {
  THUMB_MAX_BYTES,
  isFetchableThumb,
  isStoredThumb,
  thumbExtension,
  thumbObjectPath,
} from '@/lib/import/thumb'

const BUCKET = 'import-thumbs'

/** Au-delà, on renonce : l'import ne doit pas attendre un CDN qui traîne. */
const FETCH_TIMEOUT_MS = 8000

/**
 * Télécharge `sourceUrl` et la range dans le bucket. Renvoie l'URL permanente,
 * ou `null` si quoi que ce soit a échoué (l'appelant garde alors l'URL
 * d'origine, qui vaut mieux que rien tant qu'elle n'a pas expiré).
 */
export async function persistImportThumb(
  userId: string,
  importId: string,
  sourceUrl: string | null | undefined
): Promise<string | null> {
  // Déjà chez nous : ne pas retélécharger ce qu'on vient de ranger.
  if (isStoredThumb(sourceUrl)) return sourceUrl ?? null
  if (!isFetchableThumb(sourceUrl)) return null

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(sourceUrl as string, {
        signal: controller.signal,
        // Certains CDN refusent une requête sans agent reconnaissable.
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Forkmap/1.0)' },
      })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) return null

    // Le type est lu sur la RÉPONSE, pas déduit de l'extension de l'URL : un
    // CDN dont la signature a expiré répond volontiers `text/html` avec un
    // code 200, et on rangerait une page d'erreur en guise de photo.
    const ext = thumbExtension(res.headers.get('content-type'))
    if (!ext) return null

    const declared = Number(res.headers.get('content-length') ?? '0')
    if (declared > THUMB_MAX_BYTES) return null

    const bytes = new Uint8Array(await res.arrayBuffer())
    // Re-vérifié après lecture : `content-length` peut mentir ou manquer.
    if (bytes.byteLength === 0 || bytes.byteLength > THUMB_MAX_BYTES) return null

    const path = thumbObjectPath(userId, importId, ext)
    const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
      contentType: res.headers.get('content-type') ?? `image/${ext}`,
      upsert: true,
    })
    if (error) {
      console.warn('[thumb] upload échoué', error.message)
      return null
    }

    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  } catch {
    // Réseau, délai dépassé, CDN fermé : on renonce en silence.
    return null
  }
}
