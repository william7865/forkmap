// ============================================================
// lib/wikidata.ts — Wikidata + Wikipedia enrichment (free, unlimited)
// Gets descriptions, Michelin stars, distinctions, Wikipedia excerpt
// ============================================================

import { cacheGet, cacheSet } from './cache'

const WIKIDATA_ENTITY = 'https://www.wikidata.org/wiki/Special:EntityData'
const WIKIPEDIA_API = 'https://fr.wikipedia.org/api/rest_v1/page/summary'

// cacheGet returns null on a MISS, so we need a distinct sentinel to cache
// "looked up, found nothing" (otherwise a miss looks like a cached failure).
const NEG = '__none__'

export interface WikidataData {
  wikidata_id?: string
  description?: string // From Wikidata/Wikipedia
  michelin_stars?: number // 1, 2, or 3
  distinctions?: string[] // e.g. ["Michelin ⭐", "Bib Gourmand"]
  wikipedia_url?: string
  image_url?: string // Wikimedia Commons
}

// ── Wikidata entity fetch (by Q-id) ──────────────────────────
// Free, fast, reliable — pulls image (P18), French description and the
// French Wikipedia sitelink for a place that has a wikidata=Q… OSM tag.
async function queryWikidataEntity(qid: string): Promise<WikidataData | null> {
  if (!/^Q\d+$/.test(qid)) return null
  const cacheKey = `wd-entity:${qid}`
  const cached = cacheGet<WikidataData | string>(cacheKey)
  if (cached === NEG) return null
  if (cached !== null) return cached as WikidataData

  try {
    const res = await fetch(`${WIKIDATA_ENTITY}/${qid}.json`, {
      headers: { 'User-Agent': 'Forkmap/1.0 (https://forkmap.vercel.app)' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    if (!res.ok) {
      cacheSet(cacheKey, NEG, 3600)
      return null
    }

    const data = await res.json()
    const entity = data?.entities?.[qid]
    if (!entity) {
      cacheSet(cacheKey, NEG, 3600)
      return null
    }

    const claims = entity.claims ?? {}
    const imageFile: string | undefined = claims.P18?.[0]?.mainsnak?.datavalue?.value
    const image_url = imageFile
      ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFile)}?width=800`
      : undefined

    const description: string | undefined =
      entity.descriptions?.fr?.value ?? entity.descriptions?.en?.value

    const frTitle: string | undefined = entity.sitelinks?.frwiki?.title
    const wikipedia_url = frTitle
      ? `https://fr.wikipedia.org/wiki/${encodeURIComponent(frTitle.replace(/ /g, '_'))}`
      : undefined

    const result: WikidataData = { wikidata_id: qid, image_url, description, wikipedia_url }
    cacheSet(cacheKey, result, 86400) // Cache 24h
    return result
  } catch {
    cacheSet(cacheKey, NEG, 3600)
    return null
  }
}

// ── Wikipedia excerpt ────────────────────────────────────────
async function getWikipediaExcerpt(title: string): Promise<string | null> {
  const cacheKey = `wiki:${title}`
  const cached = cacheGet<string>(cacheKey)
  if (cached === NEG) return null
  if (cached !== null) return cached

  try {
    const encoded = encodeURIComponent(title.replace(/ /g, '_'))
    const res = await fetch(`${WIKIPEDIA_API}/${encoded}`, {
      headers: { 'User-Agent': 'Forkmap/1.0 (https://forkmap.vercel.app)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      cacheSet(cacheKey, NEG, 3600)
      return null
    }
    const data = await res.json()
    const excerpt: string | null = data.extract ?? null
    cacheSet(cacheKey, excerpt ?? NEG, 86400)
    return excerpt
  } catch {
    cacheSet(cacheKey, NEG, 3600)
    return null
  }
}

// ── OSM tag → Wikidata direct link ──────────────────────────
// Some OSM nodes have wikidata= or wikipedia= tags directly
export async function enrichFromOsmTags(
  tags: Record<string, string>
): Promise<WikidataData | null> {
  const wikidataId = tags['wikidata']
  const wikipediaRaw = tags['wikipedia'] // e.g. "fr:Le Meurice"

  if (!wikidataId && !wikipediaRaw) return null

  const result: WikidataData = {}

  if (wikidataId) {
    result.wikidata_id = wikidataId
    // Could do a Wikidata entity lookup here but keep it simple for now
  }

  if (wikipediaRaw) {
    const parts = wikipediaRaw.split(':')
    const title = parts.length > 1 ? parts.slice(1).join(':') : parts[0]
    const excerpt = await getWikipediaExcerpt(title)
    if (excerpt) result.description = excerpt.slice(0, 400)
    result.wikipedia_url = `https://fr.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
  }

  return Object.keys(result).length > 0 ? result : null
}

// ── Michelin from OSM tags ───────────────────────────────────
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

// ── Main enrichment function ─────────────────────────────────
export async function enrichWithWikidata(
  _osmId: string,
  tags: Record<string, string>
): Promise<WikidataData | null> {
  // 1. Extract what we can directly from OSM tags (free, instant)
  const fromTags = extractMichelinFromTags(tags)
  const fromOsm = await enrichFromOsmTags(tags)

  // 2. If OSM links a Wikidata entity, fetch it (image + description + Wikipedia)
  const wikidataTag = tags['wikidata']
  let fromWikidata: WikidataData | null = null
  if (wikidataTag) {
    fromWikidata = await queryWikidataEntity(wikidataTag)
  }

  const merged: WikidataData = {
    ...fromWikidata,
    ...fromOsm,
    ...fromTags,
  }

  // Only return if we have something meaningful
  if (
    !merged.description &&
    !merged.michelin_stars &&
    !merged.distinctions?.length &&
    !merged.wikidata_id
  ) {
    return null
  }

  return merged
}
