// GET /api/visits/stats — aggregated visit statistics
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getVisitStats } from "@/lib/db";

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { userId } = auth as { userId: string; error: null };
  try {
    const stats = await getVisitStats(userId);
    return NextResponse.json({ data: stats });
  } catch (err) {
    return NextResponse.json({ error: "Failed to compute stats" }, { status: 500 });
  }
}
