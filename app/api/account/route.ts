// ============================================================
// app/api/account/route.ts — DELETE /api/account
//
// Permanently deletes the authenticated user's account:
//   1. Delete all favorites rows (user data)
//   2. Delete the Supabase Auth user (requires service role)
//
// This satisfies GDPR Art. 17 right to erasure.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function DELETE(req: NextRequest) {
  // Very tight limit — this is a destructive, irreversible operation
  const limited = rateLimit(req, { limit: 3, windowMs: 300_000 }); // 3 per 5 min
  if (limited) return limited;

  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    // Step 1: Delete all user data from favorites table
    const { error: favError } = await adminClient
      .from("favorites")
      .delete()
      .eq("user_id", auth.userId);

    if (favError) {
      console.error("[DELETE /api/account] Failed to delete favorites:", favError);
      // Continue — partial cleanup is better than blocking deletion
    }

    // Step 2: Delete the auth user (requires service role / admin API)
    const { error: authError } = await adminClient.auth.admin.deleteUser(auth.userId);

    if (authError) {
      console.error("[DELETE /api/account] Failed to delete auth user:", authError);
      return NextResponse.json(
        { error: "Failed to delete account. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/account] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
