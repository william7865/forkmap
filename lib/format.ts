// Shared French formatting helpers — the single home for relative time,
// dates, price/distance labels and avatar initials (previously re-implemented
// in a handful of components).

/** "à l'instant" · "il y a 5 min" · "il y a 2 h" · "il y a 3 j" · "il y a 2 sem" */
export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `il y a ${d} j`
  return `il y a ${Math.floor(d / 7)} sem`
}

/** "aujourd'hui" · "hier" · "il y a 3 j" · "il y a 2 sem" · "12 mars 2026" */
export function relDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`
  return formatShortDate(iso)
}

/** "12 mars 2026" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Up to two uppercase initials from a display name — "Marie Dupont" → "MD". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

/** Foursquare price tier (1–4) → "€" · "€€" · … */
export function priceLabel(price?: number): string {
  return price == null ? '' : '€'.repeat(price)
}

/** Metres → walking time label ("À côté" under a minute). ~80 m/min. */
export function formatWalkTime(metres?: number): string {
  if (metres == null) return ''
  const mins = Math.round(metres / 80)
  if (mins < 1) return 'À côté'
  return `${mins} min`
}
