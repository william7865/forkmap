// lib/poll-token.ts — Anonymous voter identity persisted in localStorage.
// One stable token per device lets a voter change their vote and prevents
// trivial double-voting, without requiring an account.

const KEY = 'forkmap_voter'

/** Get (or lazily create) this device's anonymous voter token. SSR-safe. */
export function getVoterToken(): string {
  if (typeof window === 'undefined') return ''
  try {
    let t = localStorage.getItem(KEY)
    if (!t) {
      t = crypto.randomUUID()
      localStorage.setItem(KEY, t)
    }
    return t
  } catch {
    return ''
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
