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

/**
 * L'identifiant de fiche Google d'un lieu, s'il en a un.
 *
 * Les lieux trouvés via Google portent leur identifiant dans le slot `fsq`,
 * sous la forme `0x47e671e4bea0305b:0x5dc2e16febad2dff`. C'est la clé qui ouvre
 * LA bonne fiche, sans passer par une recherche.
 */
export function googleFeatureId(fsqId: string | null | undefined): string | null {
  if (typeof fsqId !== 'string') return null
  return /^0x[0-9a-f]+:0x[0-9a-f]+$/i.test(fsqId) ? fsqId : null
}

/**
 * L'URL qui ouvre DIRECTEMENT la fiche d'un lieu, par son identifiant.
 *
 * À préférer toujours à une recherche : une recherche par nom rend une LISTE
 * de résultats, dont on ne peut pas garantir que le premier soit le bon. C'est
 * ce qui a fait afficher les photos d'un autre établissement.
 */
export function mapsPlaceUrl(featureId: string, lat: number, lon: number): string {
  const data = `!4m5!3m4!1s${featureId}!8m2!3d${lat}!4d${lon}`
  return `https://www.google.com/maps/place/data=${data}?hl=fr&gl=fr`
}

/**
 * L'URL de recherche, avec la position dans le CHEMIN.
 *
 * ⚠️ Ne jamais mettre les coordonnées dans le texte cherché : Google les traite
 * comme des mots. « La Perla 48.85576,2.35614 » lançait une recherche sur cette
 * chaîne littérale et retombait sur une liste centrée ailleurs. La position se
 * déclare après `@`.
 */
export function mapsSearchUrl(name: string, lat: number, lon: number): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${lat},${lon},17z?hl=fr&gl=fr`
}

/** Minuscules, sans accents ni ponctuation : pour comparer deux libellés. */
function normalise(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Le titre du panneau correspond-il au lieu attendu ?
 *
 * Dernier rempart quand on a dû passer par une recherche : mieux vaut ne rien
 * afficher que les photos d'un autre restaurant. Google rallonge parfois le nom
 * (« Gangnam » → « Gangnam Restaurant Coréen »), d'où la comparaison par
 * inclusion et non par égalité.
 */
export function titleMatchesPlace(panelTitle: string | null | undefined, name: string): boolean {
  if (!panelTitle || !name) return false
  const a = normalise(panelTitle)
  const b = normalise(name)
  if (!a || !b) return false
  // Sous 3 caractères, l'inclusion ne prouve rien.
  if (a.length < 3 || b.length < 3) return a === b
  return a.includes(b) || b.includes(a)
}

/** Ce qu'on range dans le cache partagé : des URL, et la date de récolte. */
export interface CachedPhotos {
  urls: string[]
  at: string
}

/** Un mois : au-delà, une fiche a pu changer de photos ou les perdre. */
export const PHOTO_CACHE_MAX_AGE_DAYS = 30

/**
 * Lit une entrée du cache partagé, ou null si elle est inutilisable.
 *
 * ⚠️ On ne stocke QUE des URL, jamais les images : Google les héberge déjà.
 * L'écart est décisif — environ 500 octets par restaurant au lieu de 1,3 Mo,
 * soit 7 Mo pour tout Paris au lieu de 20 Go, et donc pas de plan payant.
 * En contrepartie une URL peut mourir, d'où la péremption.
 */
export function parseCachedPhotos(
  raw: unknown,
  now: Date = new Date(),
  maxAgeDays: number = PHOTO_CACHE_MAX_AGE_DAYS
): string[] | null {
  if (!raw || typeof raw !== 'object') return null
  const { urls, at } = raw as Partial<CachedPhotos>
  if (!Array.isArray(urls) || urls.length === 0) return null
  const kept = urls.filter((u): u is string => typeof u === 'string' && isGooglePhotoUrl(u))
  if (kept.length === 0) return null
  if (typeof at !== 'string') return null
  const age = now.getTime() - new Date(at).getTime()
  if (!Number.isFinite(age) || age < 0) return null
  if (age > maxAgeDays * 24 * 60 * 60 * 1000) return null
  return kept
}

/** N'accepte que des URL de photos Google, dédoublonnées et bornées. */
export function sanitisePhotoUrls(urls: unknown, max = 8): string[] {
  if (!Array.isArray(urls)) return []
  return dedupeGooglePhotos(urls.filter((u): u is string => typeof u === 'string')).slice(0, max)
}
