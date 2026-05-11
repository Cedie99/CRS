import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions, ctrEvents, cisSubmissions, notifications } from "@/lib/db/schema";

// PATCH /api/ctr/[id]/approve — Senior Approver approves CTR and flips CIS.customerType
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;
  if (role !== "senior_approver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [ctr] = await db
    .select({
      id: ctrSubmissions.id,
      status: ctrSubmissions.status,
      cisId: ctrSubmissions.cisId,
      agentId: ctrSubmissions.agentId,
      targetCustomerType: ctrSubmissions.targetCustomerType,
    })
    .from(ctrSubmissions)
    .where(eq(ctrSubmissions.id, id))
    .limit(1);

  if (!ctr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ctr.status !== "pending_approval") {
    return NextResponse.json({ error: "CTR is not pending approval" }, { status: 409 });
  }

  let body: { note?: string } = {};
  try {
    body = await req.json();
  } catch {
    // note is optional
  }

  // Fetch current CIS customerType for beforeSnapshot
  const [cis] = await db
    .select({
      customerType: cisSubmissions.customerType,
      tradeName: cisSubmissions.tradeName,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, ctr.cisId))
    .limit(1);

  const beforeSnapshot = { customerType: cis?.customerType ?? null };

  // Flip CIS.customerType
  await db
    .update(cisSubmissions)
    .set({ customerType: ctr.targetCustomerType as typeof cisSubmissions.customerType._.data, updatedAt: new Date() })
    .where(eq(cisSubmissions.id, ctr.cisId));

  // Advance CTR to approved
  await db
    .update(ctrSubmissions)
    .set({
      status: "approved",
      beforeSnapshot,
      updatedAt: new Date(),
    })
    .where(eq(ctrSubmissions.id, id));

  await db.insert(ctrEvents).values({
    ctrId: id,
    actorId: userId,
    action: "approved",
    note: typeof body.note === "string" ? body.note.trim() || null : null,
  });

  const tradeName = cis?.tradeName ?? "a customer";

  await db.insert(notifications).values({
    cisId: ctr.cisId,
    ctrId: id,
    recipientId: ctr.agentId,
    type: "in_app",
    message: `Customer Type Reclassification for ${tradeName} has been approved. Customer type is now ${ctr.targetCustomerType.replace(/_/g, " ")}.`,
    status: "pending",
  });

  return NextResponse.json({ ok: true });
}
