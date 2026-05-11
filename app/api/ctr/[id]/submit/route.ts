import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions, ctrEvents, cisSubmissions, users, notifications } from "@/lib/db/schema";

// PATCH /api/ctr/[id]/submit — agent submits a CTR draft for review
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

  const [ctr] = await db
    .select({
      id: ctrSubmissions.id,
      agentId: ctrSubmissions.agentId,
      status: ctrSubmissions.status,
      cisId: ctrSubmissions.cisId,
      targetCustomerType: ctrSubmissions.targetCustomerType,
    })
    .from(ctrSubmissions)
    .where(eq(ctrSubmissions.id, id))
    .limit(1);

  if (!ctr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ctr.agentId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (ctr.status !== "draft") {
    return NextResponse.json({ error: "Only draft CTR forms can be submitted" }, { status: 409 });
  }

  const nextStatus =
    ctr.targetCustomerType === "dealer" ? "pending_legal_review" : "pending_finance_review";
  const reviewerRole =
    nextStatus === "pending_legal_review" ? "legal_approver" : "finance_reviewer";

  await db
    .update(ctrSubmissions)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(ctrSubmissions.id, id));

  await db.insert(ctrEvents).values({
    ctrId: id,
    actorId: userId,
    action: "submitted",
  });

  const [cis] = await db
    .select({ tradeName: cisSubmissions.tradeName })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, ctr.cisId))
    .limit(1);

  const tradeName = cis?.tradeName ?? "a customer";

  const reviewers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, reviewerRole as typeof users.role._.data));

  if (reviewers.length > 0) {
    await db.insert(notifications).values(
      reviewers.map((reviewer) => ({
        cisId: ctr.cisId,
        ctrId: id,
        recipientId: reviewer.id,
        type: "in_app" as const,
        message: `New Customer Type Reclassification submitted for ${tradeName}`,
        status: "pending" as const,
      }))
    );
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
