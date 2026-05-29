import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions, cusEvents, cisSubmissions, users, notifications } from "@/lib/db/schema";

// PATCH /api/cus/[id]/submit — agent submits a CUS draft for review
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

  const [cus] = await db
    .select({
      id: cusSubmissions.id,
      agentId: cusSubmissions.agentId,
      status: cusSubmissions.status,
      cisId: cusSubmissions.cisId,
      newCustomerType: cusSubmissions.newCustomerType,
      newPaymentTerms: cusSubmissions.newPaymentTerms,
      docValidId: cusSubmissions.docValidId,
      docSecDti: cusSubmissions.docSecDti,
      docBirCertificate: cusSubmissions.docBirCertificate,
      docBankStatement: cusSubmissions.docBankStatement,
    })
    .from(cusSubmissions)
    .where(eq(cusSubmissions.id, id))
    .limit(1);

  if (!cus) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cus.agentId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (cus.status !== "draft") {
    return NextResponse.json({ error: "Only draft CUS forms can be submitted" }, { status: 409 });
  }

  // Look up the linked CIS to determine routing by customerType and current payment terms
  const [cis] = await db
    .select({
      customerType: cisSubmissions.customerType,
      tradeName: cisSubmissions.tradeName,
      paymentTerms: cisSubmissions.paymentTerms,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, cus.cisId))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Linked CIS not found" }, { status: 404 });

  // Document validation: if changing from COD to "with_terms", require financial documents
  const currentPaymentTerms = cis.paymentTerms?.toLowerCase() || "";
  const newPaymentTerms = cus.newPaymentTerms?.toLowerCase() || "";
  const isMovingToWithTerms = newPaymentTerms === "with_terms" && currentPaymentTerms !== "with_terms";

  if (isMovingToWithTerms) {
    const hasValidId = cus.docValidId && Array.isArray(cus.docValidId) && cus.docValidId.length > 0;
    const hasSecDti = cus.docSecDti && Array.isArray(cus.docSecDti) && cus.docSecDti.length > 0;
    const hasBir = cus.docBirCertificate && Array.isArray(cus.docBirCertificate) && cus.docBirCertificate.length > 0;
    const hasBankStatement = cus.docBankStatement && Array.isArray(cus.docBankStatement) && cus.docBankStatement.length > 0;

    const missingDocs: string[] = [];
    if (!hasValidId) missingDocs.push("Valid ID");
    if (!hasSecDti) missingDocs.push("SEC/DTI Registration");
    if (!hasBir) missingDocs.push("BIR Certificate");
    if (!hasBankStatement) missingDocs.push("Bank Statement");

    if (missingDocs.length > 0) {
      return NextResponse.json(
        {
          error: "Documents required for credit terms",
          message: `Changing to credit terms requires: ${missingDocs.join(", ")}. Please upload these documents before submitting.`,
        },
        { status: 400 }
      );
    }
  }

  // If the CUS requests a customer type reclassification, route based on the
  // new type — not the original CIS type.
  const effectiveCustomerType = cus.newCustomerType ?? cis.customerType;
  const nextStatus =
    effectiveCustomerType === "dealer" ? "pending_legal_review" : "pending_finance_review";

  const reviewerRole =
    nextStatus === "pending_legal_review" ? "legal_approver" : "finance_reviewer";

  // Update CUS status
  await db
    .update(cusSubmissions)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(cusSubmissions.id, id));

  // Insert workflow event
  await db.insert(cusEvents).values({
    cusId: id,
    actorId: userId,
    action: "submitted",
  });

  // Notify relevant reviewers
  const reviewers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, reviewerRole as typeof users.role._.data));

  const tradeName = cis.tradeName ?? "a customer";

  if (reviewers.length > 0) {
    await db.insert(notifications).values(
      reviewers.map((reviewer) => ({
        cisId: cus.cisId,
        cusId: id,
        recipientId: reviewer.id,
        type: "in_app" as const,
        message: `New Customer Update Sheet submitted for ${tradeName}`,
        status: "pending" as const,
      }))
    );
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
