// ============================================================
// lib/api-auth.ts — Shared server-side auth helper
//
// STRATEGY: Read the Supabase access_token from the
// "Authorization: Bearer <token>" header.
//
// WHY NOT COOKIES:
//   Parsing Supabase v2 cookies server-side without @supabase/ssr
//   is fragile — the cookie name, chunking, and encoding vary by
//   project config. Passing the token in the Authorization header
//   is the official Supabase recommendation for custom API routes
//   when @supabase/ssr is not installed.
//
// CLIENT SIDE: every fetch to a protected endpoint must include:
//   headers: { "Authorization": `Bearer ${session.access_token}` }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export interface AuthResult {
  userId: string;
  error: null;
}
export interface AuthError {
  userId: null;
  error: NextResponse;
}
export type AuthCheck = AuthResult | AuthError;

const UNAUTHORIZED: AuthError = {
  userId: null,
  error: NextResponse.json(
    { error: "Authentication required" },
    { status: 401 }
  ),
};

/**
 * Verify the caller's Supabase session.
 * Reads the JWT from the "Authorization: Bearer <token>" header.
 *
 * Returns { userId, error: null } on success, or { userId: null, error: 401 }.
 */
export async function requireUser(req: NextRequest): Promise<AuthCheck> {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) return UNAUTHORIZED;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return UNAUTHORIZED;

    return { userId: user.id, error: null };
  } catch {
    return UNAUTHORIZED;
  }
}
