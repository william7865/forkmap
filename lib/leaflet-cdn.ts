// ============================================================
// lib/leaflet-cdn.ts — chargement de Leaflet depuis le CDN, une seule fois.
//
// Leaflet touche `window` à l'import : tout module qui l'utilise doit être tiré
// par `dynamic(..., { ssr: false })`. Le chargeur lui-même était recopié dans
// chaque mini-carte ; il vit ici pour qu'une troisième carte n'en ajoute pas
// une troisième copie.
//
// Les ids d'élément (`lf-css`, `lf-js`) sont ceux de MapView : une page qui a
// déjà payé Leaflet ne le retélécharge pas.
// ============================================================

// Leaflet est chargé au runtime depuis le CDN et n'a pas de types ici.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LeafletNS = any

const LEAFLET_VERSION = '1.9.4'

/**
 * Insère une balise une seule fois et résout quand elle a VRAIMENT abouti.
 *
 * Le piège : une balise déjà présente peut être encore en vol. Résoudre
 * immédiatement dans ce cas rendait la main avant que `window.L` existe, et la
 * deuxième carte de la page ne s'initialisait jamais. D'où le drapeau
 * `data-settled`, et l'écoute de `load` quand il manque.
 */
function loadAsset(tag: 'script' | 'link', id: string, attrs: Record<string, string>) {
  return new Promise<void>((resolve) => {
    const existing = document.getElementById(id) as HTMLElement | null
    if (existing) {
      if (existing.dataset.settled === '1') resolve()
      else {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => resolve(), { once: true })
      }
      return
    }
    const el = document.createElement(tag)
    el.id = id
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
    const settle = () => {
      el.dataset.settled = '1'
      resolve()
    }
    el.onload = settle
    el.onerror = settle
    document.head.appendChild(el)
  })
}

/** Charge CSS + JS puis rend le namespace Leaflet, ou null si le CDN a échoué. */
export async function loadLeaflet(): Promise<LeafletNS | null> {
  if (typeof window === 'undefined') return null
  await loadAsset('link', 'lf-css', {
    rel: 'stylesheet',
    href: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`,
  })
  await loadAsset('script', 'lf-js', {
    src: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`,
    crossorigin: '',
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).L ?? null
}

/**
 * Le fond de carte de l'app, clair ou sombre.
 *
 * ⚠️ Ne PAS revenir à `rastertiles/voyager` : ce chemin exige désormais une clé
 * et rend des tuiles barrées d'un filigrane « API KEY REQUIRED ».
 */
export function tileUrl(dark: boolean): string {
  return `https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`
}

/** Attribution ODbL — obligation légale du fond de carte, pas une décoration. */
export const TILE_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">les contributeurs d’OpenStreetMap</a>'

/** Le thème courant, tel que CapacitorInit le pose sur <html>. */
export function isDarkTheme(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
}
