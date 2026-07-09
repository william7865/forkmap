// ============================================================
// tests/vote-token.test.ts
//
// The voter token used to be minted by the browser and sent in the request
// body, so anyone could forge a fresh one per request. It is now signed by the
// server. These tests pin the two properties that matter: a valid cookie is
// honoured, and anything the server did not sign is refused.
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest'
import type { NextRequest } from 'next/server'

beforeAll(() => {
  process.env.POLL_TOKEN_SECRET = 'test-secret-for-vote-token'
})

/** Minimal stand-in for the only part of NextRequest resolveVoter touches. */
function reqWithCookie(value?: string): NextRequest {
  return {
    cookies: { get: (name: string) => (value && name === 'fm_voter' ? { value } : undefined) },
  } as unknown as NextRequest
}

async function load() {
  return await import('@/lib/vote-token')
}

describe('resolveVoter', () => {
  it('mints a signed identity when no cookie is present', async () => {
    const { resolveVoter } = await load()
    const { token, cookieValue } = resolveVoter(reqWithCookie())
    expect(token).toMatch(/^[0-9a-f-]{36}$/)
    expect(cookieValue).toContain(`${token}.`)
  })

  it('honours a cookie it signed itself, and mints nothing new', async () => {
    const { resolveVoter } = await load()
    const first = resolveVoter(reqWithCookie())
    const again = resolveVoter(reqWithCookie(first.cookieValue!))
    expect(again.token).toBe(first.token)
    expect(again.cookieValue).toBeNull()
  })

  it('refuses a token whose signature was tampered with', async () => {
    const { resolveVoter } = await load()
    const { cookieValue } = resolveVoter(reqWithCookie())
    const [id] = cookieValue!.split('.')
    const forged = `${id}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
    const out = resolveVoter(reqWithCookie(forged))
    expect(out.token).not.toBe(id)
    expect(out.cookieValue).not.toBeNull()
  })

  it('refuses an unsigned value — the old client-minted token shape', async () => {
    const { resolveVoter } = await load()
    const out = resolveVoter(reqWithCookie('7b1f2c34-0000-4000-8000-000000000000'))
    expect(out.cookieValue).not.toBeNull() // a fresh identity was minted instead
  })

  it('keeps the caller-supplied fallback only when no cookie exists (native)', async () => {
    const { resolveVoter } = await load()
    const out = resolveVoter(reqWithCookie(), 'native-token-42')
    expect(out.token).toBe('native-token-42')
    expect(out.cookieValue).toBeNull()
  })

  it('lets the signed cookie win over a caller-supplied fallback', async () => {
    const { resolveVoter } = await load()
    const mine = resolveVoter(reqWithCookie())
    const out = resolveVoter(reqWithCookie(mine.cookieValue!), 'attacker-chosen')
    expect(out.token).toBe(mine.token)
  })
})
