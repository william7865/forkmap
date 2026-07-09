// ============================================================
// lib/vote-token.ts — Server-issued anonymous voter identity.
//
// SERVER ONLY. Never import from a 'use client' module: it reads a secret.
//
// A poll vote is deduped by `voter_token`. That token used to be minted by the
// browser (lib/poll-token.ts) and sent in the request body, so anyone could
// forge a fresh one per request and stuff the ballot.
//
// The token is now a random id carried in an httpOnly cookie and signed with an
// HMAC, so a client cannot mint one the server will accept. Be clear about what
// this does and does not buy:
//
//   • It stops forgery, and it lets a voter change their vote (stable identity).
//   • It does NOT stop ballot stuffing on its own — a script that drops the
//     cookie simply gets a fresh identity on the next request. What raises the
//     cost of stuffing is the per-IP, per-poll cap in the vote route.
//
// Eliminating stuffing entirely requires an account per vote.
// ============================================================

import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

export const VOTER_COOKIE = 'fm_voter'

/** Same lifetime as the cookie: long enough that a voter can revise their vote. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function secret(): string {
  // Any server-only secret works; the service-role key is always present where
  // this runs. POLL_TOKEN_SECRET lets an operator rotate voter identities
  // without rotating database credentials.
  const s = process.env.POLL_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('vote-token: no signing secret configured')
  return s
}

function sign(id: string): string {
  return createHmac('sha256', secret()).update(id).digest('base64url')
}

/** `<uuid>.<hmac>` — the value stored in the cookie. */
function serialise(id: string): string {
  return `${id}.${sign(id)}`
}

/** Returns the id if the signature checks out, else null. */
function parse(value: string | undefined): string | null {
  if (!value) return null
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return null
  const id = value.slice(0, dot)
  const given = Buffer.from(value.slice(dot + 1))
  const want = Buffer.from(sign(id))
  if (given.length !== want.length) return null
  return timingSafeEqual(given, want) ? id : null
}

export interface VoterIdentity {
  /** The value to store in `poll_votes.voter_token`. */
  token: string
  /** Set only when a new identity was minted — write it back as a cookie. */
  cookieValue: string | null
}

/**
 * Resolve the caller's voter identity from their signed cookie, minting one if
 * absent or tampered with.
 *
 * `fallback` keeps the native app working. Its WebView talks to this API
 * cross-origin, where the cookie is not sent, so it still supplies the token it
 * generated locally. That path is no better than before — the per-IP cap is what
 * protects it — but it must not regress into "cannot change my vote".
 */
export function resolveVoter(req: NextRequest, fallback?: string | null): VoterIdentity {
  const fromCookie = parse(req.cookies.get(VOTER_COOKIE)?.value)
  if (fromCookie) return { token: fromCookie, cookieValue: null }

  if (fallback) return { token: fallback, cookieValue: null }

  const id = randomUUID()
  return { token: id, cookieValue: serialise(id) }
}

/** Cookie attributes. SameSite=Lax: the vote is a same-origin POST on the web. */
export function voterCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  }
}
