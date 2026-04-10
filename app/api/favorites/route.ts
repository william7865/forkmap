// ============================================================
// app/api/favorites/route.ts — GET + POST + DELETE /api/favorites
//
// SECURITY FIX: Removed FALLBACK_USER pattern. All routes now
// require a valid authenticated session via requireUser().
// Unauthenticated requests receive 401 — not a shared fallback.
// Rate limiting added on all endpoints.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFavorites, addFavorite } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  try {
    const favorites = await getFavorites(auth.userId);
    return NextResponse.json({ data: favorites });
  } catch (err) {
    console.error("[GET /api/favorites]", err);
    return NextResponse.json({ error: "Failed to load favourites" }, { status: 500 });
  }
}

const AddFavoriteSchema = z.object({
  place: z.object({
    osm_id:   z.string().min(1).max(64),
    osm_type: z.enum(["node", "way", "relation"]),
    name:     z.string().min(1).max(255),
    lat:      z.number().min(-90).max(90),
    lon:      z.number().min(-180).max(180),
    tags:     z.record(z.string()),
  }).passthrough(),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = AddFavoriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await addFavorite(auth.userId, parsed.data.place as any);
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/favorites]", err);
    return NextResponse.json({ error: "Failed to save favourite" }, { status: 500 });
  }
}

// DELETE /api/favorites — bulk delete all (account deletion flow)
export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { error } = await db.from("favorites").delete().eq("user_id", auth.userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/favorites]", err);
    return NextResponse.json({ error: "Failed to delete favourites" }, { status: 500 });
  }
}
