const RE = /^[a-z0-9_]{3,20}$/
const YEAR_MS = 365 * 24 * 3600 * 1000

export function validateUsername(
  raw: string
): { ok: true; username: string } | { ok: false; reason: string } {
  const u = raw.trim().toLowerCase()
  if (u.length < 3) return { ok: false, reason: 'Au moins 3 caractères.' }
  if (u.length > 20) return { ok: false, reason: 'Au plus 20 caractères.' }
  if (!RE.test(u)) return { ok: false, reason: 'Lettres minuscules, chiffres et _ uniquement.' }
  return { ok: true, username: u }
}

export function canChangeUsername(
  lastChangedAt: string | null,
  nowMs: number
): { ok: true } | { ok: false; nextChangeAt: string } {
  if (!lastChangedAt) return { ok: true }
  const last = new Date(lastChangedAt).getTime()
  const next = last + YEAR_MS
  if (nowMs >= next) return { ok: true }
  return { ok: false, nextChangeAt: new Date(next).toISOString() }
}
