import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions } from "@/lib/db/schema";

// PATCH /api/ctr/[id]/finance-save — persist credit/metric fields without advancing workflow
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "finance_reviewer" && role !== "legal_approver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [ctr] = await db
    .select({
      id: ctrSubmissions.id,
      status: ctrSubmissions.status,
      targetCustomerType: ctrSubmissions.targetCustomerType,
    })
    .from(ctrSubmissions)
    .where(eq(ctrSubmissions.id, id))
    .limit(1);

  if (!ctr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowedStatus =
    role === "legal_approver" ? "pending_legal_review" : "pending_finance_review";

  if (ctr.status !== allowedStatus) {
    return NextResponse.json({ error: "CTR is not in a reviewable state" }, { status: 409 });
  }

  if (role === "finance_reviewer" && ctr.targetCustomerType === "dealer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "legal_approver" && ctr.targetCustomerType !== "dealer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};

  if (typeof body.financeCreditLimit === "string") {
    updates.financeCreditLimit = body.financeCreditLimit.trim();
  }
  if (typeof body.financeCreditTerms === "string") {
    updates.financeCreditTerms = body.financeCreditTerms.trim();
  }

  if (body.financeMetricPoints && typeof body.financeMetricPoints === "object") {
    const mp = body.financeMetricPoints as Record<string, unknown>;
    const parsed: Record<string, number> = {};
    for (const key of ["annualSales", "netIncome", "bankBalance", "businessLife"]) {
      const v = mp[key];
      if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 5) {
        parsed[key] = v;
      }
    }
    if (Object.keys(parsed).length > 0) updates.financeMetricPoints = parsed;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  }

  updates.updatedAt = new Date();

  await db
    .update(ctrSubmissions)
    .set(updates)
    .where(eq(ctrSubmissions.id, id));

  return NextResponse.json({ ok: true });
}
