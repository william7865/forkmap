// ============================================================
// app/api/osm/overpass/route.ts — GET /api/osm/overpass
// Rate limiting added: 30 requests/min per IP.
// Cache-Control header added for Vercel CDN caching.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRestaurantsInBbox } from "@/lib/overpass";
import { cacheAside, buildBboxKey } from "@/lib/cache";
import { rateLimit } from "@/lib/rate-limit";
import type { OverpassApiResponse } from "@/types";

const QuerySchema = z.object({
  bbox: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/),
  types: z.string().optional().default("restaurant")
    .transform((s) => s.split(",") as Array<"restaurant" | "cafe" | "bar" | "fast_food">),
});

const MAX_BBOX_DEGREES = 0.3;
const MIN_BBOX_DEGREES = 0.002;
const CACHE_TTL = 600; // 10 minutes

export async function GET(req: NextRequest): Promise<NextResponse<OverpassApiResponse>> {
  // 30 map moves per minute is generous for normal use
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, message: "Too many map requests. Slow down a little!" });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const raw = { bbox: searchParams.get("bbox") ?? "", types: searchParams.get("types") ?? undefined };

  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid bbox" }, { status: 400 });
  }

  const { bbox, types } = parsed.data;
  const [minLon, minLat, maxLon, maxLat] = bbox.split(",").map(Number);
  const spanLon = maxLon - minLon;
  const spanLat = maxLat - minLat;

  if (spanLon < MIN_BBOX_DEGREES || spanLat < MIN_BBOX_DEGREES) {
    return NextResponse.json({ data: [], count: 0, cached: false });
  }

  if (spanLon > MAX_BBOX_DEGREES || spanLat > MAX_BBOX_DEGREES) {
    return NextResponse.json({ error: "Zoom in to search.", data: [], count: 0 }, { status: 200 });
  }

  const bbox_key = buildBboxKey(minLon, minLat, maxLon, maxLat, types);

  try {
    const { data: places, cached } = await cacheAside(
      bbox_key,
      CACHE_TTL,
      () => getRestaurantsInBbox({ minLon, minLat, maxLon, maxLat, includeTypes: types })
    );

    const limited_places = places.slice(0, 200);

    const res = NextResponse.json({
      data: limited_places,
      count: limited_places.length,
      cached,
      bbox_key,
    });

    // Allow CDN/browser to cache fresh responses for 5 minutes
    // stale-while-revalidate allows serving cached data while fetching fresh
    res.headers.set(
      "Cache-Control",
      cached ? `public, max-age=${CACHE_TTL}, stale-while-revalidate=120` : "public, max-age=60, stale-while-revalidate=120"
    );

    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Overpass failed: ${message}` }, { status: 502 });
  }
}
