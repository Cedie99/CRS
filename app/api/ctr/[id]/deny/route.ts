import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions, ctrEvents, cisSubmissions, notifications } from "@/lib/db/schema";

// PATCH /api/ctr/[id]/deny — deny a CTR (reviewer or senior_approver)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;
  if (
    role !== "finance_reviewer" &&
    role !== "legal_approver" &&
    role !== "senior_approver"
  ) {
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

  const deniableStatuses = [
    "pending_legal_review", "pending_finance_review",
    "pending_documents", "pending_approval",
  ];

  if (!deniableStatuses.includes(ctr.status)) {
    return NextResponse.json({ error: "CTR cannot be denied in its current state" }, { status: 409 });
  }

  // Role-specific target type check
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

  const note = typeof body.note === "string" ? body.note.trim() || null : null;

  await db
    .update(ctrSubmissions)
    .set({ status: "denied", updatedAt: new Date() })
    .where(eq(ctrSubmissions.id, id));

  await db.insert(ctrEvents).values({
    ctrId: id,
    actorId: userId,
    action: "denied",
    note,
  });

  const [cis] = await db
    .select({ tradeName: cisSubmissions.tradeName })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, ctr.cisId))
    .limit(1);

  const tradeName = cis?.tradeName ?? "a customer";

  await db.insert(notifications).values({
    cisId: ctr.cisId,
    ctrId: id,
    recipientId: ctr.agentId,
    type: "in_app",
    message: `Customer Type Reclassification for ${tradeName} has been denied${note ? `: ${note}` : ""}`,
    status: "pending",
  });

  return NextResponse.json({ ok: true });
}
