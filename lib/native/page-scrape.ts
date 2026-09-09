// ============================================================
// lib/native/page-scrape.ts — exécuter du JavaScript dans une page distante.
//
// Enveloppe du plugin natif `PageScrape` (ios/App/App/AppDelegate.swift), avec
// un no-op côté web comme tous les wrappers de lib/native : le site n'a pas de
// navigateur hors écran à sa disposition, et ne doit pas planter pour autant.
//
// Sert à lire ce qui n'existe qu'après exécution du JavaScript d'une page —
// typiquement la galerie photos d'une fiche Google.
// ============================================================
import { isNativeRuntime } from '@/lib/native/platform'

/** Vrai quand une page peut réellement être chargée et lue. */
export function canScrapePages(): boolean {
  if (!isNativeRuntime()) return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(globalThis as any).Capacitor?.Plugins?.PageScrape
}

/**
 * Charge `url`, attend `settleMs`, exécute `script` et rend ce qu'il renvoie.
 *
 * `script` DOIT produire une chaîne : le pont natif ne transporte pas d'objet
 * arbitraire. Sérialiser en JSON dans le script et analyser ici.
 *
 * Ne jette jamais : une page inaccessible, un délai dépassé ou un plugin absent
 * rendent `null`. L'appelant garde ce qu'il avait.
 */
export async function evaluateOnPage(
  url: string,
  script: string,
  settleMs = 3500
): Promise<string | null> {
  if (!canScrapePages()) return null
  // Le plugin ne traite qu'une page à la fois et rejette le reste avec
  // « busy ». Deux lieux ouverts coup sur coup se marchaient dessus et le
  // second repartait bredouille : on patiente et on retente plutôt que
  // d'abandonner.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plugin = (globalThis as any).Capacitor.Plugins.PageScrape
      const res = await plugin.evaluate({ url, script, settleMs })
      return typeof res?.result === 'string' ? res.result : null
    } catch (err) {
      const busy = /busy/i.test(err instanceof Error ? err.message : String(err))
      if (!busy || attempt === 2) return null
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  return null
}
