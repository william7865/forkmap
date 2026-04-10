// PATCH /api/visits/[visitId]  — update a visit
// DELETE /api/visits/[visitId] — delete a visit
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { updateVisit, deleteVisit } from "@/lib/db";

const PatchSchema = z.object({
  visited_at:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount_spent:    z.number().min(0).max(99999).nullable().optional(),
  people_count:    z.number().int().min(1).max(100).optional(),
  personal_rating: z.number().int().min(1).max(5).nullable().optional(),
  mood:            z.enum(["solo","couple","friends","family","work"]).optional(),
  note:            z.string().max(1000).optional(),
}).partial();

export async function PATCH(req: NextRequest, { params }: { params: { visitId: string } }) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  try {
    const visit = await updateVisit(auth.userId as string, params.visitId ?? "", parsed.data as any);
    return NextResponse.json({ data: visit });
  } catch {
    return NextResponse.json({ error: "Failed to update visit" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { visitId: string } }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  try {
    await deleteVisit(auth.userId as string, params.visitId ?? "");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete visit" }, { status: 500 });
  }
}
