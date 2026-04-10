// ============================================================
// app/api/favorites/[osmId]/route.ts — DELETE /api/favorites/:osmId
//
// SECURITY FIX: requireUser() replaces FALLBACK_USER.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { removeFavorite } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ osmId: string }> }
) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  try {
    const { osmId } = await params;
    await removeFavorite(auth.userId, decodeURIComponent(osmId));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/favorites/:osmId]", err);
    return NextResponse.json({ error: "Failed to remove favourite" }, { status: 500 });
  }
}
