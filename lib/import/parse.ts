// ============================================================
// lib/import/parse.ts — pure helpers to turn a social post's page into a
// restaurant search query. No network / no React so it stays testable.
// The strategy: read the post's Open Graph / oEmbed text, pull out the most
// restaurant-like signal (handle, title, hashtags), and hand a query to the
// existing Google resolver. An optional LLM step can refine this server-side.
// ============================================================

export type ImportPlatform = 'tiktok' | 'instagram' | 'youtube' | 'other'

export interface OgMeta {
  title?: string
  description?: string
  image?: string
  site_name?: string
}

export interface ImportCandidate {
  platform: ImportPlatform
  /** @handle from the URL/caption — often the venue's account. */
  handle: string | null
  /** Cleaned title (platform boilerplate stripped). */
  title: string
  /** Full caption/description text (kept as the "what the post says" blurb). */
  description: string
  /** Hashtags found in the text (lowercased, without #). */
  hashtags: string[]
  /** The search string to feed the place resolver. */
  query: string
}

const DECODE: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&nbsp;': ' ',
}
function decodeEntities(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, (m) => DECODE[m] ?? m)
}

/** Extract Open Graph / Twitter card metadata from raw HTML. */
export function extractOgTags(html: string): OgMeta {
  const pick = (prop: string): string | undefined => {
    // Match <meta property="og:x" content="..."> in either attribute order.
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`,
      'i'
    )
    const m = re.exec(html)
    const v = m?.[1] ?? m?.[2]
    return v ? decodeEntities(v).trim() : undefined
  }
  return {
    title: pick('og:title') ?? pick('twitter:title'),
    description: pick('og:description') ?? pick('twitter:description'),
    image: pick('og:image') ?? pick('twitter:image'),
    site_name: pick('og:site_name'),
  }
}

export function platformFromUrl(url: string): ImportPlatform {
  const u = url.toLowerCase()
  if (u.includes('tiktok.')) return 'tiktok'
  if (u.includes('instagram.')) return 'instagram'
  if (u.includes('youtube.') || u.includes('youtu.be')) return 'youtube'
  return 'other'
}

/** Pull the @handle from a TikTok/Instagram URL (e.g. tiktok.com/@kodawari/...). */
export function handleFromUrl(url: string): string | null {
  const at = /(?:tiktok\.com|instagram\.com)\/@?([a-zA-Z0-9._]{2,30})/i.exec(url)
  if (at && !['p', 'reel', 'reels', 'tv', 'explore'].includes(at[1].toLowerCase())) {
    return at[1].replace(/^@/, '')
  }
  return null
}

const BOILERPLATE =
  /\s*(?:[|•·—-]\s*)?(?:tiktok|instagram|youtube|watch|regarder|facebook)\b.*$/i

/** Strip platform boilerplate/suffixes from a post title. */
export function cleanTitle(title: string, _platform: ImportPlatform): string {
  let t = decodeEntities(title).trim()
  // "Author on TikTok: caption" → keep the caption part (before stripping, so
  // the platform word inside the prefix doesn't swallow the caption).
  const onPlatform = /\bon (?:tiktok|instagram|youtube|facebook)\s*:\s*(.+)$/i.exec(t)
  if (onPlatform) t = onPlatform[1].trim()
  else t = t.replace(BOILERPLATE, '').trim()
  return t.replace(/["“”]/g, '').trim()
}

export function extractHashtags(text: string): string[] {
  return [...text.matchAll(/#([\p{L}0-9_]{2,30})/gu)].map((m) => m[1].toLowerCase())
}

/** A handle like "kodawari.ramen" → "kodawari ramen" for a readable query. */
function humanizeHandle(handle: string): string {
  return handle.replace(/[._]+/g, ' ').trim()
}

/**
 * Build a restaurant search query from a post's metadata + URL.
 * Prefers the account handle (usually the venue), enriched with the cleaned
 * title; falls back to the title alone.
 */
export function buildImportCandidate(og: OgMeta, url: string): ImportCandidate {
  const platform = platformFromUrl(url)
  const handle = handleFromUrl(url)
  const title = cleanTitle(og.title ?? '', platform)
  const description = decodeEntities(og.description ?? '').trim()
  const hashtags = extractHashtags(`${title} ${description}`)

  const parts: string[] = []
  if (handle) parts.push(humanizeHandle(handle))
  // Add the title if it adds signal beyond the handle.
  if (title && (!handle || !title.toLowerCase().includes(humanizeHandle(handle)))) {
    parts.push(title)
  }
  let query = parts.join(' ').trim()
  if (query.length < 3) query = title || description.slice(0, 60)
  // Cap length so the resolver query stays focused.
  query = query.replace(/\s+/g, ' ').slice(0, 80).trim()

  return { platform, handle, title, description, hashtags, query }
}
