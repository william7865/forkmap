// ============================================================
// lib/rate-limit.ts — Sliding-window in-memory rate limiter
//
// Works per-IP. Uses a Map<ip, number[]> of request timestamps.
// Simple and dependency-free — suitable for a single Vercel
// serverless instance. For multi-region you'd use Upstash Redis.
//
// Usage:
//   const limited = rateLimit(req, { limit: 30, windowMs: 60_000 });
//   if (limited) return limited; // returns a 429 NextResponse
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

interface Options {
  /** Max requests allowed within windowMs */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
  /** Human-readable message returned in the 429 body */
  message?: string
  /**
   * Distinguishes two limiters on the same route. Without it, a burst limiter
   * and a long-window limiter share one key and each call appends a timestamp
   * to the other's window, so both count double.
   */
  bucket?: string
}

// Global store — survives across requests within the same process
const store = new Map<string, number[]>()

// Clean up stale entries every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of store.entries()) {
    // If the most recent timestamp is older than 10 minutes, purge entry
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 600_000) {
      store.delete(key)
    }
  }
}, 300_000)

/**
 * Extract the client IP from the request headers.
 *
 * Order matters. `x-vercel-forwarded-for` and `x-real-ip` are stamped by the
 * platform and cannot be forged by the caller. `x-forwarded-for` is a
 * client-supplied header that the proxy appends to, so only its rightmost entry
 * is trustworthy — and only when a trusted proxy is actually in front. Behind no
 * proxy at all, every caller previously collapsed onto the shared `127.0.0.1`
 * bucket, so one client could exhaust the limit for everybody.
 */
function getClientIp(req: NextRequest): string {
  const platformIp = req.headers.get('x-vercel-forwarded-for') ?? req.headers.get('x-real-ip')
  if (platformIp) return platformIp.trim()

  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const ips = xff.split(',').map((s) => s.trim())
    return ips[ips.length - 1]
  }
  return 'unknown'
}

/**
 * Check if the request should be rate-limited.
 * Returns a 429 NextResponse if the limit is exceeded, otherwise null.
 */
export function rateLimit(
  req: NextRequest,
  options: Options
): NextResponse<{ error: string }> | null {
  const {
    limit,
    windowMs,
    message = 'Too many requests. Please try again later.',
    bucket,
  } = options

  // Identify the caller using the platform-stamped IP where available
  const ip = getClientIp(req)

  const key = `${ip}:${new URL(req.url).pathname}${bucket ? `:${bucket}` : ''}`
  const now = Date.now()
  const since = now - windowMs

  // Get existing timestamps, filter to current window
  const existing = (store.get(key) ?? []).filter((t) => t > since)
  existing.push(now)
  store.set(key, existing)

  if (existing.length > limit) {
    const retryAfter = Math.ceil(windowMs / 1000)
    return NextResponse.json(
      { error: message },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((since + windowMs) / 1000)),
        },
      }
    )
  }

  return null
}
