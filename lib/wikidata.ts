// ============================================================
// lib/wikidata.ts — Wikidata + Wikipedia enrichment (free, unlimited)
// Gets descriptions, Michelin stars, distinctions, Wikipedia excerpt
// ============================================================

import { cacheGet, cacheSet } from "./cache";

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const WIKIPEDIA_API   = "https://fr.wikipedia.org/api/rest_v1/page/summary";

export interface WikidataData {
  wikidata_id?:   string;
  description?:   string;       // From Wikidata/Wikipedia
  michelin_stars?: number;       // 1, 2, or 3
  distinctions?:  string[];      // e.g. ["Michelin ⭐", "Bib Gourmand"]
  wikipedia_url?: string;
  image_url?:     string;        // Wikimedia Commons
}

// ── Wikidata SPARQL query ────────────────────────────────────
// Fetches restaurant entity by OSM reference or name+coords
async function queryWikidata(osmId: string): Promise<WikidataData | null> {
  const cacheKey = `wikidata:${osmId}`;
  const cached = cacheGet<WikidataData | null>(cacheKey);
  if (cached !== undefined) return cached;

  // Extract numeric OSM id
  const osmNum = osmId.replace(/^(node|way|relation)\//, "");

  const sparql = `
SELECT ?item ?desc ?michelinStars ?distinction ?wikipedia ?image WHERE {
  {
    ?item wdt:P402 "${osmNum}" .   # OSM relation id
  } UNION {
    ?item wdt:P11693 "${osmNum}" . # OSM node id  
  }
  OPTIONAL { ?item schema:description ?desc . FILTER(LANG(?desc) = "fr") }
  OPTIONAL { ?item wdt:P6375 ?michelinStars . }
  OPTIONAL { ?item wdt:P1352 ?distinction . }
  OPTIONAL {
    ?wikipedia schema:about ?item ;
               schema:isPartOf <https://fr.wikipedia.org/> .
  }
  OPTIONAL { ?item wdt:P18 ?image . }
}
LIMIT 1
`.trim();

  try {
    const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(sparql)}&format=json`;
    const res = await fetch(url, {
      headers: { "Accept": "application/sparql-results+json", "User-Agent": "Forkmap/1.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) { cacheSet(cacheKey, null, 3600); return null; }

    const data = await res.json();
    const bindings = data?.results?.bindings ?? [];
    if (!bindings.length) { cacheSet(cacheKey, null, 3600); return null; }

    const b = bindings[0];
    const result: WikidataData = {
      wikidata_id: b.item?.value?.split("/").pop(),
      description: b.desc?.value,
      michelin_stars: b.michelinStars?.value ? Number(b.michelinStars.value) : undefined,
      wikipedia_url: b.wikipedia?.value,
      image_url: b.image?.value,
    };

    cacheSet(cacheKey, result, 86400); // Cache 24h
    return result;
  } catch {
    cacheSet(cacheKey, null, 3600);
    return null;
  }
}

// ── Wikipedia excerpt ────────────────────────────────────────
async function getWikipediaExcerpt(title: string): Promise<string | null> {
  const cacheKey = `wiki:${title}`;
  const cached = cacheGet<string | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const encoded = encodeURIComponent(title.replace(/ /g, "_"));
    const res = await fetch(`${WIKIPEDIA_API}/${encoded}`, {
      headers: { "User-Agent": "Forkmap/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) { cacheSet(cacheKey, null, 3600); return null; }
    const data = await res.json();
    const excerpt = data.extract ?? null;
    cacheSet(cacheKey, excerpt, 86400);
    return excerpt;
  } catch {
    cacheSet(cacheKey, null, 3600);
    return null;
  }
}

// ── OSM tag → Wikidata direct link ──────────────────────────
// Some OSM nodes have wikidata= or wikipedia= tags directly
export async function enrichFromOsmTags(tags: Record<string, string>): Promise<WikidataData | null> {
  const wikidataId  = tags["wikidata"];
  const wikipediaRaw = tags["wikipedia"];  // e.g. "fr:Le Meurice"

  if (!wikidataId && !wikipediaRaw) return null;

  const result: WikidataData = {};

  if (wikidataId) {
    result.wikidata_id = wikidataId;
    // Could do a Wikidata entity lookup here but keep it simple for now
  }

  if (wikipediaRaw) {
    const parts = wikipediaRaw.split(":");
    const title = parts.length > 1 ? parts.slice(1).join(":") : parts[0];
    const excerpt = await getWikipediaExcerpt(title);
    if (excerpt) result.description = excerpt.slice(0, 400);
    result.wikipedia_url = `https://fr.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  }

  return Object.keys(result).length > 0 ? result : null;
}

// ── Michelin from OSM tags ───────────────────────────────────
export function extractMichelinFromTags(tags: Record<string, string>): Partial<WikidataData> {
  const stars = tags["stars"] ?? tags["michelin:stars"] ?? tags["award:michelin"];
  const result: Partial<WikidataData> = {};
  const distinctions: string[] = [];

  if (stars) {
    const n = Number(stars);
    if (!isNaN(n) && n >= 1 && n <= 3) {
      result.michelin_stars = n;
      distinctions.push("⭐".repeat(n) + " Michelin");
    }
  }

  if (tags["award:bib_gourmand"] === "yes" || tags["michelin:bib_gourmand"] === "yes") {
    distinctions.push("Bib Gourmand");
  }
  if (tags["award:michelin_plate"] === "yes") {
    distinctions.push("Assiette Michelin");
  }

  if (distinctions.length) result.distinctions = distinctions;
  return result;
}

// ── Main enrichment function ─────────────────────────────────
export async function enrichWithWikidata(
  osmId: string,
  tags: Record<string, string>
): Promise<WikidataData | null> {
  // 1. Extract what we can directly from OSM tags (free, instant)
  const fromTags = extractMichelinFromTags(tags);
  const fromOsm  = await enrichFromOsmTags(tags);

  // 2. Query Wikidata if OSM has a wikidata link
  const wikidataTag = tags["wikidata"];
  let fromWikidata: WikidataData | null = null;
  if (wikidataTag) {
    // Direct Wikidata entity fetch is faster than SPARQL by OSM id
    fromWikidata = await queryWikidata(osmId);
  }

  const merged: WikidataData = {
    ...fromWikidata,
    ...fromOsm,
    ...fromTags,
  };

  // Only return if we have something meaningful
  if (!merged.description && !merged.michelin_stars && !merged.distinctions?.length && !merged.wikidata_id) {
    return null;
  }

  return merged;
}
