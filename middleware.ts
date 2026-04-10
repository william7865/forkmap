// ============================================================
// middleware.ts — intentionally minimal
//
// WHY NOT CHECK AUTH HERE:
// Supabase v2 stores the session as chunked JSON cookies:
//   sb-[projectRef]-auth-token.0
//   sb-[projectRef]-auth-token.1  (etc.)
// Reading and reassembling them in a Next.js middleware is
// fragile — any mismatch causes false redirects for logged-in
// users (the bug we hit: ?auth=required even when connected).
//
// Auth protection is handled client-side by useAuthGuard in
// each protected page. This is reliable because useAuthGuard
// uses the same Supabase browser client that manages the
// session, so it always has the correct auth state.
// ============================================================

import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

// Empty matcher = middleware never runs, zero overhead
export const config = {
  matcher: [],
};
