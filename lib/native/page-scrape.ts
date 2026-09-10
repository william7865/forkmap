// ============================================================
// lib/native/page-scrape.ts — exécuter du JavaScript dans une page distante.
//
// Enveloppe du plugin natif `PageScrape` (ios AppDelegate.swift), avec un
// no-op côté web comme tous les wrappers de lib/native : le site n'a pas de
// navigateur hors écran, et ne doit pas planter pour autant.
//
// Sert à lire ce qui n'existe qu'après exécution du JavaScript d'une page —
// typiquement la galerie photos d'une fiche Google.
//
// ⚠️ Le plugin s'obtient par `registerPlugin()` de @capacitor/core, comme
// RawHttp juste à côté. Une première version testait
// `globalThis.Capacitor.Plugins.PageScrape`, qui n'est PAS peuplé pour les
// plugins enregistrés sur le pont : la condition était toujours fausse, et
// ouvrir une fiche ne déclenchait rien du tout — sans la moindre erreur.
// ============================================================
import { registerPlugin } from '@capacitor/core'
import { isNativeRuntime } from './platform'

interface PageScrapePlugin {
  evaluate(options: { url: string; script: string; settleMs?: number }): Promise<{ result: string }>
}

const PageScrape = registerPlugin<PageScrapePlugin>('PageScrape')

/** Vrai quand une page peut réellement être chargée et lue. */
export function canScrapePages(): boolean {
  return isNativeRuntime()
}

/**
 * Charge `url`, exécute `script` dès que la page répond, et rend ce qu'il
 * renvoie. `settleMs` est un PLAFOND : le natif interroge la page toutes les
 * 300 ms et rend la main dès qu'elle est prête.
 *
 * `script` DOIT produire une chaîne — le pont natif ne transporte pas d'objet
 * arbitraire — et la chaîne VIDE signifie « pas encore prêt ».
 *
 * Ne jette jamais : page inaccessible, délai dépassé ou plugin absent rendent
 * `null`. L'appelant garde ce qu'il avait.
 */
export async function evaluateOnPage(
  url: string,
  script: string,
  settleMs = 3500
): Promise<string | null> {
  if (!canScrapePages()) return null
  // Le plugin ne traite qu'une page à la fois et rejette le reste avec
  // « busy ». Deux lieux ouverts coup sur coup se marchaient dessus et le
  // second repartait bredouille : on patiente et on retente.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await PageScrape.evaluate({ url, script, settleMs })
      return typeof res?.result === 'string' ? res.result : null
    } catch (err) {
      const busy = /busy/i.test(err instanceof Error ? err.message : String(err))
      if (!busy || attempt === 2) return null
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  return null
}
