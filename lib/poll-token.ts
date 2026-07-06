// lib/poll-token.ts — Anonymous voter identity persisted in localStorage.
// One stable token per device lets a voter change their vote and prevents
// trivial double-voting, without requiring an account.

const KEY = 'forkmap_voter'

/** Session fallback when localStorage is unavailable (private mode / disabled).
 *  Kept module-level so repeated calls in one page load return the SAME token —
 *  otherwise the load and the vote would use different ids. */
let memToken = ''

function randomId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    // Non-secure context: crypto.randomUUID may be missing.
    return `v-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`
  }
}

/** Get (or lazily create) this device's anonymous voter token. SSR-safe.
 *  Never returns '' on the client — a stable per-session token still lets a
 *  voter change their vote and keeps distinct voters distinct. */
export function getVoterToken(): string {
  if (typeof window === 'undefined') return ''
  try {
    let t = localStorage.getItem(KEY)
    if (!t) {
      t = randomId()
      localStorage.setItem(KEY, t)
    }
    return t
  } catch {
    if (!memToken) memToken = randomId()
    return memToken
  }
}

const NAME_KEY = 'forkmap_voter_name'

/** Remember the voter's display name across polls. */
export function getVoterName(): string {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setVoterName(name: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    /* storage disabled — non-fatal */
  }
}
