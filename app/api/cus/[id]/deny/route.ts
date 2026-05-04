import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions, cusEvents, cisSubmissions, notifications } from "@/lib/db/schema";

// PATCH /api/cus/[id]/deny — deny a CUS
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

  const [cus] = await db
    .select({
      id: cusSubmissions.id,
      status: cusSubmissions.status,
      cisId: cusSubmissions.cisId,
      agentId: cusSubmissions.agentId,
    })
    .from(cusSubmissions)
    .where(eq(cusSubmissions.id, id))
    .limit(1);

  if (!cus) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (
    cus.status !== "pending_finance_review" &&
    cus.status !== "pending_legal_review"
  ) {
    return NextResponse.json({ error: "CUS is not pending review" }, { status: 409 });
  }

  let body: { note?: string } = {};
  try {
    body = await req.json();
  } catch {
    // note is optional
  }

  const note = typeof body.note === "string" ? body.note.trim() || null : null;

  // Transition to denied
  await db
    .update(cusSubmissions)
    .set({ status: "denied", updatedAt: new Date() })
    .where(eq(cusSubmissions.id, id));

  // Workflow event
  await db.insert(cusEvents).values({
    cusId: id,
    actorId: userId,
    action: "denied",
    note,
  });

  // Look up CIS tradeName for notification message
  const [cis] = await db
    .select({ tradeName: cisSubmissions.tradeName })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, cus.cisId))
    .limit(1);

  const tradeName = cis?.tradeName ?? "a customer";

  // Notify the submitting agent
  await db.insert(notifications).values({
    cisId: cus.cisId,
    cusId: id,
    recipientId: cus.agentId,
    type: "in_app",
    message: `Customer Update Sheet for ${tradeName} has been denied${note ? `: ${note}` : ""}`,
    status: "pending",
  });

  return NextResponse.json({ ok: true });
}
