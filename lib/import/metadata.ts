'use client'
// lib/import/metadata.ts — fetch a social post's signals from the DEVICE
// (residential IP; the same reason the Google scrape runs on device). Returns the
// Open Graph caption/title/thumbnail AND the venue the creator geotagged. Null on
// web, where the native HTTP bridge is unavailable.
import { nativeHttpGetText } from '@/lib/native/http'
import { extractOgTags, platformFromUrl, type OgMeta } from '@/lib/import/parse'
import { extractLocationTag, type LocationTag } from '@/lib/import/location'

// TikTok/Instagram serve a JS-only shell to normal browser UAs (no Open Graph
// in the HTML). They DO serve og:title/og:description to link-preview crawlers.
// So we fetch as a crawler to actually get the caption/title.
const HEADERS = {
  'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  Accept: 'text/html,application/xhtml+xml',
}

export interface PostMetadata {
  og: OgMeta
  /** The venue the creator tagged on the post, when the page exposes one. */
  location: LocationTag | null
}

async function oembed(endpoint: string): Promise<OgMeta | null> {
  const res = await nativeHttpGetText(endpoint, HEADERS)
  if (!res || res.status !== 200) return null
  try {
    const j = JSON.parse(res.data) as {
      title?: string
      author_name?: string
      thumbnail_url?: string
    }
    if (!j.title && !j.thumbnail_url) return null
    return {
      title: j.title,
      description: j.title,
      image: j.thumbnail_url,
      site_name: j.author_name,
    }
  } catch {
    return null
  }
}

/**
 * Fetch a post's metadata: caption/title/thumbnail (Open Graph) + geotag.
 *
 * The page HTML is fetched once — it carries BOTH the Open Graph tags and the
 * geotag (JSON-LD / TikTok POI / Instagram location). For TikTok & YouTube an
 * extra oEmbed call refines the caption (cleaner than the crawler's og:title),
 * while the higher-res og:image and the geotag are kept from the HTML.
 *
 * Native-only — returns null on web.
 */
export async function fetchPostMetadata(url: string): Promise<PostMetadata | null> {
  const platform = platformFromUrl(url)
  const enc = encodeURIComponent(url)

  const page = await nativeHttpGetText(url, HEADERS)
  const html = page?.status === 200 ? page.data : ''
  const location = html ? extractLocationTag(html, platform) : null
  let og: OgMeta = html ? extractOgTags(html) : {}

  if (platform === 'tiktok' || platform === 'youtube') {
    const endpoint =
      platform === 'tiktok'
        ? `https://www.tiktok.com/oembed?url=${enc}`
        : `https://www.youtube.com/oembed?url=${enc}&format=json`
    const oe = await oembed(endpoint)
    if (oe?.title) {
      og = {
        title: oe.title,
        description: oe.description ?? oe.title,
        image: og.image ?? oe.image,
        site_name: oe.site_name ?? og.site_name,
        video: og.video, // oEmbed has no video — keep the one parsed from the HTML
      }
    }
  }

  const hasOg = !!(og.title || og.description)
  if (!hasOg && !location) return null
  return { og, location }
}
