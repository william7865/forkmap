// GET /api/visits  — list all visits
// POST /api/visits — log a new visit
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getVisits, addVisit } from "@/lib/db";

const VisitSchema = z.object({
  osm_id:          z.string().min(1).max(64),
  name:            z.string().min(1).max(255),
  lat:             z.number(),
  lon:             z.number(),
  visited_at:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount_spent:    z.number().min(0).max(99999).nullable().optional(),
  people_count:    z.number().int().min(1).max(100).default(1),
  personal_rating: z.number().int().min(1).max(5).nullable().optional(),
  mood:            z.enum(["solo","couple","friends","family","work"]).optional(),
  note:            z.string().max(1000).optional(),
  snapshot:        z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { userId } = auth as { userId: string; error: null };
  try {
    const visits = await getVisits(userId);
    return NextResponse.json({ data: visits });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load visits" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { userId: uid } = auth as { userId: string; error: null };

  const body = await req.json().catch(() => null);
  const parsed = VisitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  try {
    const visit = await addVisit(uid, {
      ...parsed.data,
      amount_spent: parsed.data.amount_spent ?? undefined,
      personal_rating: parsed.data.personal_rating ?? undefined,
    } as any);
    return NextResponse.json({ data: visit }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save visit" }, { status: 500 });
  }
}
