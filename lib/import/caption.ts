// ============================================================
// lib/import/caption.ts — turn a raw social caption/title into something
// readable. Social captions arrive as one blob: collapsed line breaks, a wall of
// trailing hashtags, emoji runs, stray @mentions. Rendered verbatim they read as
// noise. These pure helpers (no React / no network, so they stay testable) split
// the prose from the tags and tidy the title, WITHOUT paraphrasing the creator —
// their words are the reason the post was saved (see ImportDetail).
// ============================================================

import { decodeEntities } from './parse'

export interface FormattedCaption {
  /** The prose, entities decoded, line breaks preserved (max one blank line),
   *  hashtag-only lines and trailing hashtag piles removed. May be empty. */
  body: string
  /** Hashtags surfaced from the wall/trailing pile, in first-seen order, without
   *  the leading `#`, deduped case-insensitively (original casing kept). */
  hashtags: string[]
}

const HASHTAG = /#[\p{L}0-9_]{1,50}/gu
/** A "tag line": nothing but hashtags, @mentions, punctuation, emoji, whitespace —
 *  i.e. carries no prose. `\p{L}` letters only appear inside a #tag/@mention here. */
const TAG_LINE = /^(?:[#@][\p{L}0-9_]{1,50}|[^\p{L}\p{N}]+)+$/u

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const tag = raw.replace(/^#/, '')
    const key = tag.toLowerCase()
    if (!tag || seen.has(key)) continue
    seen.add(key)
    out.push(tag)
  }
  return out
}

/**
 * Split a raw caption into readable prose + a list of hashtags.
 *
 * - Decodes HTML entities.
 * - Drops lines that are only hashtags/mentions/emoji (the "hashtag wall").
 * - Trims a trailing run of ≥2 hashtags off an otherwise-prose line.
 * - Collapses 3+ blank lines to one, trims trailing spaces, trims the whole.
 * - Inline hashtags inside a sentence are LEFT in place (they read as words);
 *   only wall/trailing tags move to the chip list.
 */
export function formatCaption(raw: string | null | undefined): FormattedCaption {
  if (!raw) return { body: '', hashtags: [] }
  const decoded = decodeEntities(raw).replace(/\r\n?/g, '\n')

  const collectedTags: string[] = []
  const keptLines: string[] = []

  for (const line of decoded.split('\n')) {
    const trimmed = line.replace(/\s+$/, '')
    if (trimmed.trim() === '') {
      keptLines.push('')
      continue
    }
    // A pure tag/mention/emoji line carries no prose → harvest its tags, drop it.
    if (TAG_LINE.test(trimmed.trim())) {
      collectedTags.push(...(trimmed.match(HASHTAG) ?? []))
      continue
    }
    // Prose line: peel a trailing run of ≥2 hashtags into the chip list.
    const peeled = trimmed.replace(/(?:\s+#[\p{L}0-9_]{1,50}){2,}\s*$/u, (run) => {
      collectedTags.push(...(run.match(HASHTAG) ?? []))
      return ''
    })
    keptLines.push(peeled.replace(/\s+$/, ''))
  }

  // Collapse 3+ blank lines to a single blank, then trim leading/trailing blanks.
  const body = keptLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
    .trim()

  return { body, hashtags: dedupeTags(collectedTags) }
}

const LEADING_JUNK = /^[^\p{L}\p{N}]+/u
const TRAILING_JUNK = /[^\p{L}\p{N}!?)…]+$/u

/**
 * Tidy a post title for use as a heading: decode entities, strip a leading run of
 * emoji/punctuation ("🔥🔥 Le meilleur ramen" → "Le meilleur ramen"), drop any
 * hashtags, collapse whitespace and cap the length. Returns '' when nothing
 * readable is left (caller falls back to a placeholder).
 */
export function cleanTitleText(raw: string | null | undefined, max = 90): string {
  if (!raw) return ''
  let t = decodeEntities(raw).replace(/\s+/g, ' ').replace(HASHTAG, '').replace(/\s+/g, ' ').trim()
  t = t.replace(LEADING_JUNK, '').replace(TRAILING_JUNK, '').trim()
  if (t.length <= max) return t
  // Cut on a word boundary, not mid-word.
  const cut = t.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`
}
