// ============================================================
// app/api/places/google-photo/route.ts — GET /api/places/google-photo
// Same-origin image proxy for the rich-data providers. The client renders
//   <img src="/api/places/google-photo?ref=<name>&sz=600x400">   (Google API)
//   <img src="/api/places/google-photo?u=<googleusercontent-url>&sz=600x400"> (scrape/SerpAPI)
// We fetch the bytes server-side so no image URL/key is exposed to the client
// and nothing is stored (ToS-compliant — only a reference/URL travels through
// our snapshots, and it is re-fetched fresh each time).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_BASE = 'https://places.googleapis.com/v1'

// `sz` arrives as a size token like "600x400" / "220x220" / "600".
// parseInt takes the leading width. Clamp to a sane range.
function parseWidth(sz: string | null): number {
  const w = parseInt(sz ?? '', 10)
  if (Number.isNaN(w)) return 400
  return Math.min(Math.max(w, 1), 1600)
}

async function streamImage(url: string): Promise<Response> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) return new NextResponse('Photo fetch failed', { status: 502 })
  const buf = await res.arrayBuffer()
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
      // Short-lived caching only (ToS: no durable storage of Google photos).
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  const sp = req.nextUrl.searchParams
  const width = parseWidth(sp.get('sz'))

  // --- Scrape / SerpAPI thumbnails: a full googleusercontent URL ---
  const u = sp.get('u')
  if (u) {
    let parsed: URL
    try {
      parsed = new URL(u)
    } catch {
      return new NextResponse('Invalid photo url', { status: 400 })
    }
    // Host-lock to Google's image CDN — prevents an open proxy / SSRF.
    if (parsed.protocol !== 'https:' || !/\.googleusercontent\.com$/.test(parsed.hostname)) {
      return new NextResponse('Forbidden photo host', { status: 400 })
    }
    // Bump the thumbnail size (…/s44-… → …/s{width}-…) when present.
    const upsized = u.replace(/\/s\d+-/, `/s${width}-`)
    try {
      return await streamImage(upsized)
    } catch {
      return new NextResponse('Photo fetch error', { status: 502 })
    }
  }

  // --- Google Places (New) photo reference ---
  const key = process.env.GOOGLE_PLACES_API_KEY
  const ref = sp.get('ref')
  if (ref) {
    if (!key) return new NextResponse('Google photos unavailable', { status: 404 })
    // Only accept genuine photo references — avoids an open proxy / SSRF.
    if (!/^places\/[^/]+\/photos\/[^/]+$/.test(ref)) {
      return new NextResponse('Invalid photo reference', { status: 400 })
    }
    try {
      return await streamImage(`${GOOGLE_BASE}/${ref}/media?maxWidthPx=${width}&key=${key}`)
    } catch {
      return new NextResponse('Photo fetch error', { status: 502 })
    }
  }

  return new NextResponse('Missing photo reference', { status: 400 })
}
