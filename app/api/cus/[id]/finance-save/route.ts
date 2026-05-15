import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions } from "@/lib/db/schema";

// PATCH /api/cus/[id]/finance-save — persist credit/metric fields without advancing workflow
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

  const [cus] = await db
    .select({ id: cusSubmissions.id, status: cusSubmissions.status })
    .from(cusSubmissions)
    .where(eq(cusSubmissions.id, id))
    .limit(1);

  if (!cus) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Finance reviewers operate on pending_finance_review; legal_approvers on pending_legal_review
  const allowedStatus =
    role === "legal_approver" ? "pending_legal_review" : "pending_finance_review";

  if (cus.status !== allowedStatus) {
    return NextResponse.json({ error: "CUS is not in a reviewable state" }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const VALID_CUSTOMER_TYPES = [
    "dealer", "distributor", "private_label", "toll_blend", "end_user",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};

  if (typeof body.newCustomerType === "string" && VALID_CUSTOMER_TYPES.includes(body.newCustomerType)) {
    updates.newCustomerType = body.newCustomerType;
  }
  if (typeof body.newBusinessAddress === "string") {
    updates.newBusinessAddress = body.newBusinessAddress.trim() || null;
  }
  if (typeof body.newCityMunicipality === "string") {
    updates.newCityMunicipality = body.newCityMunicipality.trim() || null;
  }
  if (typeof body.financeCreditTerms === "string") {
    updates.financeCreditTerms = body.financeCreditTerms.trim() || null;
  }
  if (typeof body.financeCreditLimit === "string") {
    updates.financeCreditLimit = body.financeCreditLimit.trim() || null;
  }

  // Direct metric points (each 0-5) — stored as JSONB
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
    .update(cusSubmissions)
    .set(updates)
    .where(eq(cusSubmissions.id, id));

  return NextResponse.json({ ok: true });
}
