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
      // CUS core
      id: cusSubmissions.id,
      cisId: cusSubmissions.cisId,
      agentId: cusSubmissions.agentId,
      status: cusSubmissions.status,
      note: cusSubmissions.note,
      // CUS docs
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
      // Finance evaluation
      financeCreditLimit: cusSubmissions.financeCreditLimit,
      financeCreditTerms: cusSubmissions.financeCreditTerms,
      financeMetricPoints: cusSubmissions.financeMetricPoints,
      // Requested changes
      newTradeName: cusSubmissions.newTradeName,
      newContactPerson: cusSubmissions.newContactPerson,
      newContactNumber: cusSubmissions.newContactNumber,
      newTelephoneNumber: cusSubmissions.newTelephoneNumber,
      newEmailAddress: cusSubmissions.newEmailAddress,
      newWebsite: cusSubmissions.newWebsite,
      newNumberOfEmployees: cusSubmissions.newNumberOfEmployees,
      newCustomerType: cusSubmissions.newCustomerType,
      newBusinessAddress: cusSubmissions.newBusinessAddress,
      newCityMunicipality: cusSubmissions.newCityMunicipality,
      newLandmarks: cusSubmissions.newLandmarks,
      newDeliveryAddress: cusSubmissions.newDeliveryAddress,
      newDeliveryMobile: cusSubmissions.newDeliveryMobile,
      newDeliveryTelephone: cusSubmissions.newDeliveryTelephone,
      beforeSnapshot: cusSubmissions.beforeSnapshot,
      createdAt: cusSubmissions.createdAt,
      updatedAt: cusSubmissions.updatedAt,
      // Linked CIS fields
      cis: {
        id: cisSubmissions.id,
        tradeName: cisSubmissions.tradeName,
        contactPerson: cisSubmissions.contactPerson,
        contactNumber: cisSubmissions.contactNumber,
        telephoneNumber: cisSubmissions.telephoneNumber,
        emailAddress: cisSubmissions.emailAddress,
        website: cisSubmissions.website,
        numberOfEmployees: cisSubmissions.numberOfEmployees,
        customerType: cisSubmissions.customerType,
        businessAddress: cisSubmissions.businessAddress,
        cityMunicipality: cisSubmissions.cityMunicipality,
        landmarks: cisSubmissions.landmarks,
        deliveryAddress: cisSubmissions.deliveryAddress,
        deliveryMobile: cisSubmissions.deliveryMobile,
        deliveryTelephone: cisSubmissions.deliveryTelephone,
        status: cisSubmissions.status,
        agentCode: cisSubmissions.agentCode,
        businessType: cisSubmissions.businessType,
        financeCreditTerms: cisSubmissions.financeCreditTerms,
        financeCreditLimit: cisSubmissions.financeCreditLimit,
        // CIS docs for reference
        docValidId: cisSubmissions.docValidId,
        docMayorsPermit: cisSubmissions.docMayorsPermit,
        docSecDti: cisSubmissions.docSecDti,
        docBirCertificate: cisSubmissions.docBirCertificate,
        docLocationMap: cisSubmissions.docLocationMap,
        docFinancialStatement: cisSubmissions.docFinancialStatement,
        docBankStatement: cisSubmissions.docBankStatement,
        docProofOfBilling: cisSubmissions.docProofOfBilling,
        docLeaseContract: cisSubmissions.docLeaseContract,
        docProofOfOwnership: cisSubmissions.docProofOfOwnership,
        docStorePhoto: cisSubmissions.docStorePhoto,
        docSupplierInvoice: cisSubmissions.docSupplierInvoice,
        docSocialMedia: cisSubmissions.docSocialMedia,
        docCompanyWebsite: cisSubmissions.docCompanyWebsite,
        docIsoCertification: cisSubmissions.docIsoCertification,
        docHalalCertificate: cisSubmissions.docHalalCertificate,
        docOther: cisSubmissions.docOther,
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

  const events = await db
    .select({
      id: cusEvents.id,
      action: cusEvents.action,
      note: cusEvents.note,
      createdAt: cusEvents.createdAt,
      actorName: users.fullName,
      actorId: cusEvents.actorId,
    })
    .from(cusEvents)
    .innerJoin(users, eq(cusEvents.actorId, users.id))
    .where(eq(cusEvents.cusId, id))
    .orderBy(asc(cusEvents.createdAt));

  return NextResponse.json({ ...row, events });
}
