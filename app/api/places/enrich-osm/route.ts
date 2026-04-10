// ============================================================
// app/api/places/enrich-osm/route.ts — POST /api/places/enrich-osm
// Free enrichment pipeline: OSM deep tags + Wikidata + opening_hours
// No API keys needed. Completely free & unlimited.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enrichWithWikidata, extractMichelinFromTags } from "@/lib/wikidata";
import { extractOsmEnrichment } from "@/lib/osm-enrichment";
import { isOpenNow, getTodayHours } from "@/lib/opening-hours";
import { rateLimit } from "@/lib/rate-limit";
import { cacheAside } from "@/lib/cache";
import type { PlaceCard, OsmEnrichedData, WikidataData } from "@/types";

const PlaceSchema = z.object({
  osm_id:        z.string(),
  osm_type:      z.enum(["node", "way", "relation"]),
  name:          z.string(),
  lat:           z.number(),
  lon:           z.number(),
  tags:          z.record(z.string()).default({}),
  cuisine:       z.string().optional(),
  opening_hours: z.string().optional(),
  website:       z.string().optional(),
  phone:         z.string().optional(),
  address:       z.string().optional(),
  open_now:      z.boolean().optional(),
}).passthrough();

const BodySchema = z.object({
  places: z.array(PlaceSchema).max(30),
  // If true, also query Wikidata (slower, only for detail view)
  deep: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid body" }, { status: 400 });
  }

  const { places, deep } = parsed.data;

  const enriched = await Promise.all(
    (places as PlaceCard[]).map(async (place) => {
      const tags = place.tags ?? {};

      // 1. Deep OSM tag extraction (instant, no network)
      const osmEnriched: OsmEnrichedData = extractOsmEnrichment(tags);

      // 2. Opening hours parse (instant)
      const oh = place.opening_hours ?? tags["opening_hours"];
      if (oh && osmEnriched.open_now === undefined) {
        const parsed = isOpenNow(oh);
        if (parsed !== null) osmEnriched.open_now = parsed;
      }
      const todayHours = oh ? getTodayHours(oh) : null;
      if (todayHours) osmEnriched.today_hours = todayHours;

      // 3. Wikidata (only if deep=true or place has wikidata tag)
      let wikidata: WikidataData | null = null;
      const hasWikiTag = tags["wikidata"] || tags["wikipedia"];
      if (deep || hasWikiTag) {
        const cacheKey = `wd-enrich:${place.osm_id}`;
        const { data } = await cacheAside(cacheKey, 86400, () =>
          enrichWithWikidata(place.osm_id, tags)
        );
        wikidata = data;
      }

      // 4. Michelin from OSM tags (instant)
      const michelin = extractMichelinFromTags(tags);
      if (michelin.michelin_stars) osmEnriched.michelin = michelin.michelin_stars;
      if (michelin.distinctions?.length) {
        // Attach to wikidata-like structure
        if (!wikidata) wikidata = {};
        wikidata.distinctions = [...(wikidata.distinctions ?? []), ...michelin.distinctions];
      }

      return {
        ...place,
        osm_enriched: osmEnriched,
        wikidata: wikidata ?? undefined,
        open_now: osmEnriched.open_now ?? place.open_now,
      } as PlaceCard;
    })
  );

  return NextResponse.json({
    data: enriched,
    count: enriched.length,
    wikidata_hits: enriched.filter(p => p.wikidata).length,
  });
}
