import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";

/**
 * Lightweight endpoint to persist finance credit fields without advancing the workflow.
 * Used so that "Print Now" reflects the values the reviewer just entered.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["finance_reviewer", "legal_approver"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [cis] = await db
    .select({ id: cisSubmissions.id, status: cisSubmissions.status, financeMetricPoints: cisSubmissions.financeMetricPoints })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["pending_finance_review", "pending_legal_review"].includes(cis.status)) {
    return NextResponse.json({ error: "CIS is not in a reviewable state" }, { status: 409 });
  }

  const body = await req.json();

  const financeCreditLimit = typeof body.financeCreditLimit === "string" ? body.financeCreditLimit.trim() : undefined;
  const financeCreditTerms = typeof body.financeCreditTerms === "string" ? body.financeCreditTerms.trim() : undefined;

  // Direct metric points (each 0–5) — stored as JSONB
  let financeMetricPoints: Record<string, number> | undefined;
  if (body.metricPoints && typeof body.metricPoints === "object") {
    const mp = body.metricPoints as Record<string, unknown>;
    const parsed: Record<string, number> = {};
    for (const key of ["annualSales", "netIncome", "bankBalance", "businessLife"]) {
      const v = mp[key];
      if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 5) {
        parsed[key] = v;
      }
    }
    if (Object.keys(parsed).length > 0) {
      // Merge with existing metric points so saving one field doesn't wipe the others
      const existing = (cis.financeMetricPoints as Record<string, number> | null) ?? {};
      financeMetricPoints = { ...existing, ...parsed };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  if (financeCreditLimit    !== undefined) updates.financeCreditLimit    = financeCreditLimit;
  if (financeCreditTerms    !== undefined) updates.financeCreditTerms    = financeCreditTerms;
  if (financeMetricPoints   !== undefined) updates.financeMetricPoints   = financeMetricPoints;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  }

  await db
    .update(cisSubmissions)
    .set(updates)
    .where(eq(cisSubmissions.id, id));

  return NextResponse.json({ success: true });
}
