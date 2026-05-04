import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions, cusEvents, cisSubmissions, users } from "@/lib/db/schema";

// GET /api/cus/[id] — full CUS detail with CIS info and audit timeline
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
      // Full CUS row
      id: cusSubmissions.id,
      cisId: cusSubmissions.cisId,
      agentId: cusSubmissions.agentId,
      status: cusSubmissions.status,
      note: cusSubmissions.note,
      docValidId: cusSubmissions.docValidId,
      docMayorsPermit: cusSubmissions.docMayorsPermit,
      docSecDti: cusSubmissions.docSecDti,
      docBirCertificate: cusSubmissions.docBirCertificate,
      docLocationMap: cusSubmissions.docLocationMap,
      docFinancialStatement: cusSubmissions.docFinancialStatement,
      docBankStatement: cusSubmissions.docBankStatement,
      docProofOfBilling: cusSubmissions.docProofOfBilling,
      docLeaseContract: cusSubmissions.docLeaseContract,
      docProofOfOwnership: cusSubmissions.docProofOfOwnership,
      docStorePhoto: cusSubmissions.docStorePhoto,
      docSupplierInvoice: cusSubmissions.docSupplierInvoice,
      docSocialMedia: cusSubmissions.docSocialMedia,
      docCompanyWebsite: cusSubmissions.docCompanyWebsite,
      docIsoCertification: cusSubmissions.docIsoCertification,
      docHalalCertificate: cusSubmissions.docHalalCertificate,
      docOther: cusSubmissions.docOther,
      financeCreditLimit: cusSubmissions.financeCreditLimit,
      financeCreditTerms: cusSubmissions.financeCreditTerms,
      financeMetricPoints: cusSubmissions.financeMetricPoints,
      createdAt: cusSubmissions.createdAt,
      updatedAt: cusSubmissions.updatedAt,
      // Linked CIS fields
      cis: {
        id: cisSubmissions.id,
        tradeName: cisSubmissions.tradeName,
        contactPerson: cisSubmissions.contactPerson,
        customerType: cisSubmissions.customerType,
        status: cisSubmissions.status,
        agentCode: cisSubmissions.agentCode,
      },
    })
    .from(cusSubmissions)
    .innerJoin(cisSubmissions, eq(cusSubmissions.cisId, cisSubmissions.id))
    .where(eq(cusSubmissions.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Role-based access control
  if (role === "sales_agent" || role === "rsr") {
    if (row.agentId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (role === "finance_reviewer") {
    if (row.status !== "pending_finance_review") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (role === "legal_approver") {
    if (row.status !== "pending_legal_review") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch audit timeline with actor names
  const actorUsers = users;
  const events = await db
    .select({
      id: cusEvents.id,
      action: cusEvents.action,
      note: cusEvents.note,
      createdAt: cusEvents.createdAt,
      actorName: actorUsers.fullName,
      actorId: cusEvents.actorId,
    })
    .from(cusEvents)
    .innerJoin(actorUsers, eq(cusEvents.actorId, actorUsers.id))
    .where(eq(cusEvents.cusId, id))
    .orderBy(asc(cusEvents.createdAt));

  return NextResponse.json({ ...row, events });
}
