'use client'
// lib/import/metadata.ts — fetch a social post's Open Graph / oEmbed metadata
// from the DEVICE (residential IP; the same reason the Google scrape runs on
// device). Returns null on web, where the native HTTP bridge is unavailable.
import { nativeHttpGetText } from '@/lib/native/http'
import { extractOgTags, platformFromUrl, type OgMeta } from '@/lib/import/parse'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml',
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
    return { title: j.title, description: j.title, image: j.thumbnail_url, site_name: j.author_name }
  } catch {
    return null
  }
}

/**
 * Fetch a post's metadata (title/caption/description/thumbnail).
 * Tries oEmbed for TikTok/YouTube (clean caption), else scrapes Open Graph tags.
 * Native-only — returns null on web.
 */
export async function fetchPostMetadata(url: string): Promise<OgMeta | null> {
  const platform = platformFromUrl(url)
  const enc = encodeURIComponent(url)

  if (platform === 'tiktok') {
    const og = await oembed(`https://www.tiktok.com/oembed?url=${enc}`)
    if (og?.title) return og
  }
  if (platform === 'youtube') {
    const og = await oembed(`https://www.youtube.com/oembed?url=${enc}&format=json`)
    if (og?.title) return og
  }

  // Fallback: fetch the page and read Open Graph tags.
  const res = await nativeHttpGetText(url, HEADERS)
  if (!res || res.status !== 200) return null
  const og = extractOgTags(res.data)
  return og.title || og.description ? og : null
}
