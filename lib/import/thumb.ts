// ============================================================
// lib/import/thumb.ts — la vignette d'une vidéo, rendue permanente.
//
// Le problème, mesuré : les 40 imports en base portent 39 vignettes, et
// TOUTES renvoient 403. TikTok et Instagram servent leurs images derrière des
// URL SIGNÉES qui expirent — stocker l'adresse revient à stocker une promesse
// que le CDN ne tiendra pas. Le rail « Vus sur les réseaux » n'affichait donc
// pas des tuiles sans photo mais des photos cassées, retombées sur le dégradé.
//
// La correction : télécharger l'image pendant qu'elle est encore accessible et
// la ranger dans notre propre bucket. Ce fichier tient la partie sans réseau —
// décider ce qu'on accepte, et où ça se range — pour qu'elle soit testable.
// ============================================================

/** Types acceptés. Une vignette est une image, rien d'autre n'entre. */
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * 6 Mo. Une vignette de post en fait quelques dizaines de kilo-octets ; la
 * borne existe pour qu'une URL trompeuse ne fasse pas avaler un fichier
 * arbitraire au serveur.
 */
export const THUMB_MAX_BYTES = 6 * 1024 * 1024

/** L'extension à donner au fichier, ou null si le type n'est pas une image. */
export function thumbExtension(contentType: string | null | undefined): string | null {
  if (!contentType) return null
  const type = contentType.split(';')[0].trim().toLowerCase()
  return ALLOWED[type] ?? null
}

/**
 * Le chemin de l'objet : `{userId}/{importId}.{ext}`.
 *
 * Le dossier de tête DOIT être l'id utilisateur : les politiques du bucket
 * autorisent l'écriture sur `(storage.foldername(name))[1] = auth.uid()`,
 * exactement comme le bucket des avatars.
 */
export function thumbObjectPath(userId: string, importId: string, ext: string): string {
  return `${userId}/${importId}.${ext}`
}

/**
 * Vrai si l'URL pointe déjà vers notre propre stockage.
 *
 * Sert de garde anti-boucle : sans elle, chaque écriture re-téléchargerait la
 * vignette qu'on vient de ranger, et la re-rangerait.
 */
export function isStoredThumb(url: string | null | undefined, supabaseUrl?: string): boolean {
  if (!url) return false
  const base = supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!base) return false
  try {
    return new URL(url).origin === new URL(base).origin
  } catch {
    return false
  }
}

/**
 * Vrai si l'URL vaut la peine d'être téléchargée.
 *
 * On refuse tout ce qui n'est pas http(s) : une `data:` ou une `file:` n'a rien
 * à faire ici, et le téléchargement se fait côté serveur.
 */
export function isFetchableThumb(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
