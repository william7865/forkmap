// lib/michelin.ts — pure extraction of Michelin distinctions from OSM tags.
// Split out of lib/wikidata.ts so it can be imported client-side without
// pulling in the SPARQL/cache machinery.
import type { WikidataData } from '@/types'

export function extractMichelinFromTags(tags: Record<string, string>): Partial<WikidataData> {
  const stars = tags['stars'] ?? tags['michelin:stars'] ?? tags['award:michelin']
  const result: Partial<WikidataData> = {}
  const distinctions: string[] = []

  if (stars) {
    const n = Number(stars)
    if (!isNaN(n) && n >= 1 && n <= 3) {
      result.michelin_stars = n
      distinctions.push('⭐'.repeat(n) + ' Michelin')
    }
  }

  if (tags['award:bib_gourmand'] === 'yes' || tags['michelin:bib_gourmand'] === 'yes') {
    distinctions.push('Bib Gourmand')
  }
  if (tags['award:michelin_plate'] === 'yes') {
    distinctions.push('Assiette Michelin')
  }

  if (distinctions.length) result.distinctions = distinctions
  return result
}
