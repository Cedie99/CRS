import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions, ctrEvents, cisSubmissions, users, notifications } from "@/lib/db/schema";

// PATCH /api/ctr/[id]/request-documents — reviewer sends doc checklist to agent
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

  // Finance handles non-dealer, legal handles dealer
  if (role === "finance_reviewer" && ctr.targetCustomerType === "dealer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "legal_approver" && ctr.targetCustomerType !== "dealer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { requiredDocSlots?: string[]; requiredDocsNote?: string } = {};
  try {
    body = await req.json();
  } catch {
    // optional
  }

  if (!body.requiredDocSlots || !Array.isArray(body.requiredDocSlots) || body.requiredDocSlots.length === 0) {
    return NextResponse.json({ error: "At least one required document slot must be specified" }, { status: 400 });
  }

  await db
    .update(ctrSubmissions)
    .set({
      status: "pending_documents",
      requiredDocSlots: body.requiredDocSlots,
      requiredDocsNote: typeof body.requiredDocsNote === "string" ? body.requiredDocsNote.trim() || null : null,
      updatedAt: new Date(),
    })
    .where(eq(ctrSubmissions.id, id));

  await db.insert(ctrEvents).values({
    ctrId: id,
    actorId: userId,
    action: "documents_requested",
    note: body.requiredDocsNote?.trim() || null,
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
    message: `Documents requested for CTR on ${tradeName}. Please upload the required documents.`,
    status: "pending",
  });

  return NextResponse.json({ ok: true });
}
