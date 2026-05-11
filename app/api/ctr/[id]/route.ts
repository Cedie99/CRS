import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions, ctrEvents, cisSubmissions, users } from "@/lib/db/schema";

// GET /api/ctr/[id] — full CTR detail with CIS info and audit timeline
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { role, id: userId } = session.user;

  const [row] = await db
    .select({
      id: ctrSubmissions.id,
      cisId: ctrSubmissions.cisId,
      agentId: ctrSubmissions.agentId,
      status: ctrSubmissions.status,
      targetCustomerType: ctrSubmissions.targetCustomerType,
      reason: ctrSubmissions.reason,
      requiredDocSlots: ctrSubmissions.requiredDocSlots,
      requiredDocsNote: ctrSubmissions.requiredDocsNote,
      docValidId: ctrSubmissions.docValidId,
      docMayorsPermit: ctrSubmissions.docMayorsPermit,
      docSecDti: ctrSubmissions.docSecDti,
      docBirCertificate: ctrSubmissions.docBirCertificate,
      docLocationMap: ctrSubmissions.docLocationMap,
      docFinancialStatement: ctrSubmissions.docFinancialStatement,
      docBankStatement: ctrSubmissions.docBankStatement,
      docProofOfBilling: ctrSubmissions.docProofOfBilling,
      docLeaseContract: ctrSubmissions.docLeaseContract,
      docProofOfOwnership: ctrSubmissions.docProofOfOwnership,
      docStorePhoto: ctrSubmissions.docStorePhoto,
      docSupplierInvoice: ctrSubmissions.docSupplierInvoice,
      docSocialMedia: ctrSubmissions.docSocialMedia,
      docCompanyWebsite: ctrSubmissions.docCompanyWebsite,
      docIsoCertification: ctrSubmissions.docIsoCertification,
      docHalalCertificate: ctrSubmissions.docHalalCertificate,
      docOther: ctrSubmissions.docOther,
      financeCreditLimit: ctrSubmissions.financeCreditLimit,
      financeCreditTerms: ctrSubmissions.financeCreditTerms,
      financeMetricPoints: ctrSubmissions.financeMetricPoints,
      beforeSnapshot: ctrSubmissions.beforeSnapshot,
      createdAt: ctrSubmissions.createdAt,
      updatedAt: ctrSubmissions.updatedAt,
      cis: {
        id: cisSubmissions.id,
        tradeName: cisSubmissions.tradeName,
        contactPerson: cisSubmissions.contactPerson,
        customerType: cisSubmissions.customerType,
        status: cisSubmissions.status,
        agentCode: cisSubmissions.agentCode,
        cityMunicipality: cisSubmissions.cityMunicipality,
        businessType: cisSubmissions.businessType,
        financeCreditTerms: cisSubmissions.financeCreditTerms,
        financeCreditLimit: cisSubmissions.financeCreditLimit,
      },
    })
    .from(ctrSubmissions)
    .innerJoin(cisSubmissions, eq(ctrSubmissions.cisId, cisSubmissions.id))
    .where(eq(ctrSubmissions.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Role-based access control
  if (role === "sales_agent" || role === "rsr") {
    if (row.agentId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (role === "finance_reviewer") {
    if (
      row.status !== "pending_finance_review" &&
      row.status !== "pending_documents" &&
      row.targetCustomerType === "dealer"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (row.targetCustomerType === "dealer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (role === "legal_approver") {
    if (row.targetCustomerType !== "dealer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (role === "senior_approver") {
    if (row.status !== "pending_approval") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events = await db
    .select({
      id: ctrEvents.id,
      action: ctrEvents.action,
      note: ctrEvents.note,
      createdAt: ctrEvents.createdAt,
      actorName: users.fullName,
      actorId: ctrEvents.actorId,
    })
    .from(ctrEvents)
    .innerJoin(users, eq(ctrEvents.actorId, users.id))
    .where(eq(ctrEvents.ctrId, id))
    .orderBy(asc(ctrEvents.createdAt));

  return NextResponse.json({ ...row, events });
}
