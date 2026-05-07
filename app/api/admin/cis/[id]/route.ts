import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents, notifications, cusSubmissions, cusEvents } from "@/lib/db/schema";

// DELETE /api/admin/cis/[id] — permanently delete a CIS submission and all related records
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [existing] = await db
    .select({ id: cisSubmissions.id })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  // Delete child records first to respect FK constraints
  // cus_events → cus_submissions → notifications, workflow_events → cis_submissions
  const cusSubs = await db
    .select({ id: cusSubmissions.id })
    .from(cusSubmissions)
    .where(eq(cusSubmissions.cisId, id));

  for (const cus of cusSubs) {
    await db.delete(cusEvents).where(eq(cusEvents.cusId, cus.id));
  }

  await db.delete(cusSubmissions).where(eq(cusSubmissions.cisId, id));
  await db.delete(workflowEvents).where(eq(workflowEvents.cisId, id));
  await db.delete(notifications).where(eq(notifications.cisId, id));
  await db.delete(cisSubmissions).where(eq(cisSubmissions.id, id));

  return NextResponse.json({ success: true });
}
