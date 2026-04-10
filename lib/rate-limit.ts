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

import { NextRequest, NextResponse } from "next/server";

interface Options {
  /** Max requests allowed within windowMs */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Human-readable message returned in the 429 body */
  message?: string;
}

// Global store — survives across requests within the same process
const store = new Map<string, number[]>();

// Clean up stale entries every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of store.entries()) {
    // If the most recent timestamp is older than 10 minutes, purge entry
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 600_000) {
      store.delete(key);
    }
  }
}, 300_000);

/**
 * Check if the request should be rate-limited.
 * Returns a 429 NextResponse if the limit is exceeded, otherwise null.
 */
export function rateLimit(
  req: NextRequest,
  options: Options
): NextResponse | null {
  const { limit, windowMs, message = "Too many requests. Please try again later." } = options;

  // Identify the caller: prefer Vercel's forwarded IP, fall back to x-forwarded-for
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";

  const key   = `${ip}:${new URL(req.url).pathname}`;
  const now   = Date.now();
  const since = now - windowMs;

  // Get existing timestamps, filter to current window
  const existing = (store.get(key) ?? []).filter(t => t > since);
  existing.push(now);
  store.set(key, existing);

  if (existing.length > limit) {
    const retryAfter = Math.ceil(windowMs / 1000);
    return NextResponse.json(
      { error: message },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((since + windowMs) / 1000)),
        },
      }
    );
  }

  return null;
}
