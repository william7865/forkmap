// ============================================================
// lib/place-photos-live.ts — la galerie d'un lieu, lue sur l'appareil.
//
// Pour un lieu que l'utilisateur n'a PAS enregistré, on ne stocke rien : on lit
// la galerie au moment où la fiche s'ouvre, et on l'oublie ensuite. Le stockage
// ne grossit qu'avec ce que les gens gardent vraiment.
//
// Le chargement passe par le plugin natif (WKWebView hors écran) : ces photos
// n'existent qu'après exécution du JavaScript de la page Google, et la requête
// part de l'appareil, donc d'une IP résidentielle.
//
// ⚠️ DEUX RÈGLES, apprises en affichant les photos d'un autre restaurant :
//
//   1. Ouvrir la fiche PAR SON IDENTIFIANT quand on l'a. Une recherche par nom
//      rend une LISTE, dont rien ne garantit que le premier résultat soit le
//      bon — et les coordonnées glissées dans le texte cherché ne biaisent
//      rien du tout, Google les lit comme des mots.
//   2. Faute d'identifiant, VÉRIFIER le titre du panneau avant de récolter.
//      Mieux vaut aucune photo que celles d'à côté.
//
// Le script envoyé dans la page ne fait que récolter ; le tri, le
// dédoublonnage et la vérification restent ici, en code testé.
// ============================================================
import { evaluateOnPage, canScrapePages } from '@/lib/native/page-scrape'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import {
  dedupeGooglePhotos,
  googleFeatureId,
  googlePhotoAtSize,
  looksLikeThumbnailOnly,
  mapsPlaceUrl,
  mapsSearchUrl,
  titleMatchesPlace,
} from '@/lib/place-photos'

/**
 * Plafond d'attente, pas durée d'attente : le natif interroge la page toutes
 * les 300 ms et rend la main dès qu'elle est prête. Une attente fixe de 3,5 s
 * faisait patienter 5 à 8 secondes sur une fiche prête au bout d'une seconde.
 */
const MAX_WAIT_MS = 7000

/** Au-delà, la galerie devient un catalogue et le chargement s'allonge. */
const MAX_PHOTOS = 6

/** Largeur demandée à Google. Au-dessus, le poids grimpe sans gain visible. */
const WIDTH = 1000
const HEIGHT = 750

/**
 * Récolte le titre du panneau et les URL d'images.
 *
 * Le titre sert de preuve d'identité : il dit sur QUELLE fiche on a atterri.
 * Sur une page de résultats il vaut « Résultats », ce qui suffit à disqualifier
 * la récolte.
 */
const COLLECT = `(() => {
  const feed = document.querySelector('div[role="feed"]');
  const h1 = document.querySelector('h1');
  const title = h1 ? h1.textContent : null;
  const urls = [];
  for (const el of document.querySelectorAll('img')) if (el.src) urls.push(el.src);
  for (const el of document.querySelectorAll('[style*="googleusercontent"]')) {
    const m = (el.getAttribute('style') || '').match(/https:\\/\\/[^"')]+googleusercontent[^"')]+/);
    if (m) urls.push(m[0]);
  }
  const ready = urls.filter((u) => {
    if (!/^https:\\/\\/lh\\d+\\.googleusercontent\\.com\\//.test(u)) return false;
    const suffix = u.split('=')[1];
    if (!suffix) return true;
    const sizes = (suffix.match(/[swh](\\d+)/g) || []).map((x) => Number(x.slice(1)));
    return sizes.length === 0 || Math.max.apply(null, sizes) > 80;
  });
  // Chaîne VIDE = « pas encore prêt », le natif rappellera. Rendre un résultat
  // dès le premier tour ferait conclure « aucune photo » sur une page qui n'a
  // pas fini de se construire.
  if (!feed && ready.length < 2) return '';
  return JSON.stringify({ title: title, isList: !!feed, urls: urls });
})()`

interface Harvest {
  title: string | null
  isList: boolean
  urls: string[]
}

function parseHarvest(raw: string | null): Harvest | null {
  if (!raw) return null
  try {
    const j = JSON.parse(raw) as Partial<Harvest>
    if (!Array.isArray(j.urls)) return null
    return {
      title: typeof j.title === 'string' ? j.title : null,
      isList: !!j.isList,
      urls: j.urls.filter((u): u is string => typeof u === 'string'),
    }
  } catch {
    return null
  }
}

function toGallery(urls: string[]): string[] {
  return dedupeGooglePhotos(urls)
    .filter((u) => !looksLikeThumbnailOnly(u))
    .slice(0, MAX_PHOTOS)
    .map((u) => googlePhotoAtSize(u, WIDTH, HEIGHT))
}

/**
 * Mémoire de session, par lieu. On y range la PROMESSE, pas le résultat.
 *
 * ⚠️ C'est ce qui évite deux appels simultanés. Le plugin natif ne traite
 * qu'une page à la fois et rejette le second appel avec « busy » : le
 * préchargement lancé depuis l'aperçu et la fiche ouverte juste après se
 * marchaient dessus, la fiche recevait « busy », et ce rejet était enregistré
 * comme « aucune photo » — définitivement, pour toute la session. En rangeant
 * la promesse, la fiche ATTEND le préchargement déjà en cours.
 *
 * Rien n'est écrit sur disque : c'est tout l'intérêt du chemin « non
 * enregistré ».
 */
const memory = new Map<string, Promise<string[]>>()

/**
 * Lance la récolte SANS attendre le résultat.
 *
 * Appelé quand la carte d'aperçu s'affiche, donc plusieurs secondes avant que
 * l'utilisateur n'ouvre la fiche : au moment de l'ouverture, les photos sont
 * déjà là. C'est ce qui fait disparaître l'attente, plus que n'importe quelle
 * optimisation du chargement lui-même.
 */
export function prefetchPlacePhotos(
  key: string,
  name: string,
  lat: number,
  lon: number,
  fsqId?: string | null
): void {
  if (!canScrapePages() || memory.has(key)) return
  void scrapePlacePhotos(name, lat, lon, fsqId, key).catch(() => undefined)
}

/** Dépose les URL récoltées dans le cache partagé. Échec sans conséquence. */
async function share(osmId: string, urls: string[]): Promise<void> {
  try {
    const auth = await getAuthHeaders()
    // Sans session, la route refuse l'écriture : inutile de la solliciter.
    if (!auth.Authorization) return
    const headers = { 'Content-Type': 'application/json', ...auth }
    await apiFetch('/api/places/photos', {
      method: 'POST',
      headers,
      body: JSON.stringify({ osm_id: osmId, urls }),
    })
  } catch {
    // Le cache partagé est un bonus : son échec ne doit rien casser ici.
  }
}

/** Le travail réel, sans cache : `scrapePlacePhotos` s'en sert. */
async function harvest(
  name: string,
  lat: number,
  lon: number,
  fsqId?: string | null
): Promise<string[]> {
  // 1. Par identifiant : la bonne fiche, sans ambiguïté possible.
  const fid = googleFeatureId(fsqId)
  if (fid) {
    const found = parseHarvest(
      await evaluateOnPage(mapsPlaceUrl(fid, lat, lon), COLLECT, MAX_WAIT_MS)
    )
    return found && !found.isList ? toGallery(found.urls) : []
  }

  // 2. Sinon, recherche située — et on ne récolte QUE si le panneau ouvert est
  //    bien celui du lieu attendu.
  const found = parseHarvest(
    await evaluateOnPage(mapsSearchUrl(name, lat, lon), COLLECT, MAX_WAIT_MS)
  )
  if (!found || found.isList) return []
  if (!titleMatchesPlace(found.title, name)) return []
  return toGallery(found.urls)
}

/**
 * Les photos de la galerie, ou un tableau vide.
 *
 * Ne jette jamais : c'est un agrément, pas une condition d'affichage. Sur le
 * web, `canScrapePages()` est faux et la fonction rend [] sans rien tenter.
 */
export async function scrapePlacePhotos(
  name: string,
  lat: number,
  lon: number,
  fsqId?: string | null,
  key?: string
): Promise<string[]> {
  if (!canScrapePages() || !name) return []
  if (!key) return harvest(name, lat, lon, fsqId)

  const inFlight = memory.get(key)
  if (inFlight) return inFlight

  const p = harvest(name, lat, lon, fsqId)
  memory.set(key, p)
  const urls = await p.catch(() => [] as string[])
  // Déposé pour TOUT LE MONDE : le premier qui ouvre ce restaurant paie les
  // cinq secondes de récolte, les suivants l'ouvrent instantanément. On ne
  // partage que les URL, jamais les images — Google les héberge déjà.
  if (urls.length > 0) void share(key, urls)
  // Un échec n'est PAS mis en cache : « busy », une page trop lente ou un
  // réseau coupé ne doivent pas condamner ce lieu pour toute la session.
  // Seul un résultat utile est conservé.
  if (urls.length === 0) memory.delete(key)
  return urls
}
