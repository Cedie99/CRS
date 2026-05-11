import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions, ctrEvents, cisSubmissions, users, notifications } from "@/lib/db/schema";

// PATCH /api/ctr/[id]/forward — reviewer forwards CTR to Senior Approver
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;
  if (role !== "finance_reviewer" && role !== "legal_approver") {
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

  const expectedStatus =
    role === "legal_approver" ? "pending_legal_review" : "pending_finance_review";

  if (ctr.status !== expectedStatus) {
    return NextResponse.json({ error: "CTR is not in a reviewable state" }, { status: 409 });
  }

  if (role === "finance_reviewer" && ctr.targetCustomerType === "dealer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "legal_approver" && ctr.targetCustomerType !== "dealer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { note?: string } = {};
  try {
    body = await req.json();
  } catch {
    // note is optional
  }

  await db
    .update(ctrSubmissions)
    .set({ status: "pending_approval", updatedAt: new Date() })
    .where(eq(ctrSubmissions.id, id));

  await db.insert(ctrEvents).values({
    ctrId: id,
    actorId: userId,
    action: "forwarded_to_approver",
    note: typeof body.note === "string" ? body.note.trim() || null : null,
  });

  const [cis] = await db
    .select({ tradeName: cisSubmissions.tradeName })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, ctr.cisId))
    .limit(1);

  const tradeName = cis?.tradeName ?? "a customer";

  const approvers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "senior_approver"));

  if (approvers.length > 0) {
    await db.insert(notifications).values(
      approvers.map((approver) => ({
        cisId: ctr.cisId,
        ctrId: id,
        recipientId: approver.id,
        type: "in_app" as const,
        message: `CTR for ${tradeName} is ready for your approval`,
        status: "pending" as const,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}
