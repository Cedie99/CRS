import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";

// PATCH /api/cis/[id]/archive — agent soft-hides a denied or returned submission
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;
  if (role !== "sales_agent" && role !== "rsr") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [row] = await db
    .select({ id: cisSubmissions.id, agentId: cisSubmissions.agentId, status: cisSubmissions.status })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.agentId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["denied", "returned"].includes(row.status)) {
    return NextResponse.json({ error: "Only denied or returned submissions can be archived" }, { status: 422 });
  }

  await db
    .update(cisSubmissions)
    .set({ isArchived: true })
    .where(and(eq(cisSubmissions.id, id), inArray(cisSubmissions.status, ["denied", "returned"])));

  return NextResponse.json({ ok: true });
}
