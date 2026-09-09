// ============================================================
// lib/place-photos.ts — les photos d'un lieu, côté logique pure.
//
// Le scraper embarqué (lib/google-scrape.ts) interroge le point d'entrée
// compact de Google Maps, qui ne rend qu'UNE image par lieu — et presque
// toujours le LOGO de l'établissement, pas un plat. Mesuré sur la base : sur
// cinq photos, quatre étaient des logos.
//
// La galerie que voit un humain sur une fiche Google (photos déposées par les
// clients : plats, salle, devanture) n'est servie qu'après exécution du
// JavaScript de la page. Vérifié : URL canonique, `preview/place`,
// `photometa/v1`, `async/lcl_akp` et la recherche par `ludocid` rendent tous
// une seule image en `fetch` simple. D'où un scraper qui pilote un vrai
// navigateur, hors application (voir scripts/scrape-place-photos.mjs).
//
// Ce fichier tient la partie sans réseau, testable : reconnaître une URL de
// photo Google, et la redimensionner.
// ============================================================

/** Hôtes des images de fiches Google. */
const GOOGLE_PHOTO_HOST = /^https:\/\/lh\d+\.googleusercontent\.com\//

/**
 * Vrai si l'URL est une photo de fiche Google.
 *
 * Sert de filtre à la sortie du navigateur : la page contient aussi des
 * avatars d'auteurs d'avis et des pictogrammes, qui n'ont rien à faire dans la
 * galerie d'un restaurant.
 */
export function isGooglePhotoUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && GOOGLE_PHOTO_HOST.test(url)
}

/**
 * Réécrit la taille demandée dans une URL de photo Google.
 *
 * Ces URL se terminent par un suffixe de rendu — `=w408-h544-k-no`, `=s44-p-k`.
 * Google sert l'image à la taille demandée, donc la même photo existe en
 * vignette comme en pleine largeur. Sans réécriture on récupérerait le format
 * de la miniature affichée dans le panneau (parfois 64 px de côté), inutilisable
 * en héros de fiche.
 */
export function googlePhotoAtSize(url: string, width: number, height: number): string {
  const base = url.split('=')[0]
  return `${base}=w${Math.round(width)}-h${Math.round(height)}-k-no`
}

/**
 * Écarte les doublons : la même photo apparaît en plusieurs tailles dans la
 * page (miniature du carrousel + version ouverte). L'identité d'une photo est
 * son URL SANS le suffixe de taille.
 */
export function dedupeGooglePhotos(urls: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of urls) {
    if (!isGooglePhotoUrl(u)) continue
    const id = u.split('=')[0]
    if (seen.has(id)) continue
    seen.add(id)
    out.push(u)
  }
  return out
}

/**
 * Une vignette carrée de très petite taille (`=s44`, `=w64-h64`) est un
 * pictogramme ou un avatar, pas une photo de la galerie.
 */
export function looksLikeThumbnailOnly(url: string): boolean {
  const suffix = url.split('=')[1]
  if (!suffix) return false
  const sizes = [...suffix.matchAll(/[swh](\d+)/g)].map((m) => Number(m[1]))
  return sizes.length > 0 && Math.max(...sizes) <= 80
}
