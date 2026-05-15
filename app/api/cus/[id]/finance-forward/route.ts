import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions, cusEvents, cisSubmissions, notifications } from "@/lib/db/schema";

// Document fields shared between CUS and CIS (same key names)
const DOC_FIELDS = [
  "docValidId",
  "docMayorsPermit",
  "docSecDti",
  "docBirCertificate",
  "docLocationMap",
  "docFinancialStatement",
  "docBankStatement",
  "docProofOfBilling",
  "docLeaseContract",
  "docProofOfOwnership",
  "docStorePhoto",
  "docSupplierInvoice",
  "docSocialMedia",
  "docCompanyWebsite",
  "docIsoCertification",
  "docHalalCertificate",
  "docOther",
] as const;

// Fields that a CUS can change on the linked CIS (maps cisField → cusNewField)
const CIS_CHANGE_MAP = [
  { cisField: "tradeName",              cusField: "newTradeName" },
  { cisField: "contactPerson",          cusField: "newContactPerson" },
  { cisField: "contactNumber",          cusField: "newContactNumber" },
  { cisField: "telephoneNumber",        cusField: "newTelephoneNumber" },
  { cisField: "emailAddress",           cusField: "newEmailAddress" },
  { cisField: "website",                cusField: "newWebsite" },
  { cisField: "numberOfEmployees",      cusField: "newNumberOfEmployees" },
  { cisField: "customerType",           cusField: "newCustomerType" },
  { cisField: "businessAddress",        cusField: "newBusinessAddress" },
  { cisField: "cityMunicipality",       cusField: "newCityMunicipality" },
  { cisField: "landmarks",              cusField: "newLandmarks" },
  { cisField: "deliveryAddress",        cusField: "newDeliveryAddress" },
  { cisField: "deliveryLandmarks",      cusField: "newDeliveryLandmarks" },
  { cisField: "deliveryMobile",         cusField: "newDeliveryMobile" },
  { cisField: "deliveryTelephone",      cusField: "newDeliveryTelephone" },
  { cisField: "corporateName",          cusField: "newCorporateName" },
  { cisField: "dateOfBusinessReg",      cusField: "newDateOfBusinessReg" },
  { cisField: "tinNumber",              cusField: "newTinNumber" },
  { cisField: "businessType",           cusField: "newBusinessType" },
  { cisField: "lineOfBusiness",         cusField: "newLineOfBusiness" },
  { cisField: "lineOfBusinessOther",    cusField: "newLineOfBusinessOther" },
  { cisField: "businessActivity",       cusField: "newBusinessActivity" },
  { cisField: "businessActivityOther",  cusField: "newBusinessActivityOther" },
  { cisField: "salesChannel",           cusField: "newSalesChannel" },
  { cisField: "paymentTerms",           cusField: "newPaymentTerms" },
  { cisField: "owners",                 cusField: "newOwners" },
  { cisField: "officers",               cusField: "newOfficers" },
  { cisField: "businessLife",           cusField: "newBusinessLife" },
  { cisField: "howLongAtAddress",       cusField: "newHowLongAtAddress" },
  { cisField: "numberOfBranches",       cusField: "newNumberOfBranches" },
  { cisField: "govCertifications",      cusField: "newGovCertifications" },
  { cisField: "tradeReferences",        cusField: "newTradeReferences" },
  { cisField: "bankReferences",         cusField: "newBankReferences" },
  { cisField: "achievements",           cusField: "newAchievements" },
  { cisField: "otherMerits",            cusField: "newOtherMerits" },
  { cisField: "additionalNotes",        cusField: "newAdditionalNotes" },
  { cisField: "financeCreditTerms",     cusField: "financeCreditTerms" },
  { cisField: "financeCreditLimit",     cusField: "financeCreditLimit" },
] as const;

// PATCH /api/cus/[id]/finance-forward — approve the CUS
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
      financeCreditLimit: cusSubmissions.financeCreditLimit,
      financeCreditTerms: cusSubmissions.financeCreditTerms,
      docSirRestySigned: cusSubmissions.docSirRestySigned,
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
      newDeliveryLandmarks: cusSubmissions.newDeliveryLandmarks,
      newDeliveryMobile: cusSubmissions.newDeliveryMobile,
      newDeliveryTelephone: cusSubmissions.newDeliveryTelephone,
      newCorporateName: cusSubmissions.newCorporateName,
      newDateOfBusinessReg: cusSubmissions.newDateOfBusinessReg,
      newTinNumber: cusSubmissions.newTinNumber,
      newBusinessType: cusSubmissions.newBusinessType,
      newLineOfBusiness: cusSubmissions.newLineOfBusiness,
      newLineOfBusinessOther: cusSubmissions.newLineOfBusinessOther,
      newBusinessActivity: cusSubmissions.newBusinessActivity,
      newBusinessActivityOther: cusSubmissions.newBusinessActivityOther,
      newSalesChannel: cusSubmissions.newSalesChannel,
      newPaymentTerms: cusSubmissions.newPaymentTerms,
      newOwners: cusSubmissions.newOwners,
      newOfficers: cusSubmissions.newOfficers,
      newBusinessLife: cusSubmissions.newBusinessLife,
      newHowLongAtAddress: cusSubmissions.newHowLongAtAddress,
      newNumberOfBranches: cusSubmissions.newNumberOfBranches,
      newGovCertifications: cusSubmissions.newGovCertifications,
      newTradeReferences: cusSubmissions.newTradeReferences,
      newBankReferences: cusSubmissions.newBankReferences,
      newAchievements: cusSubmissions.newAchievements,
      newOtherMerits: cusSubmissions.newOtherMerits,
      newAdditionalNotes: cusSubmissions.newAdditionalNotes,
      // Document uploads
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

  const sirRestyFiles = Array.isArray(cus.docSirRestySigned) ? cus.docSirRestySigned : [];
  if (sirRestyFiles.length === 0) {
    return NextResponse.json(
      { error: "Upload the CFO-signed CUS form before approving." },
      { status: 422 }
    );
  }

  if (!cus.financeCreditTerms?.trim()) {
    return NextResponse.json(
      { error: "Credit terms are required before approving." },
      { status: 422 }
    );
  }

  if (!cus.financeCreditLimit?.trim()) {
    return NextResponse.json(
      { error: "Credit limit is required before approving." },
      { status: 422 }
    );
  }

  let body: { note?: string; financeCreditTerms?: string; financeCreditLimit?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional; ignore parse errors
  }

  // Accept credit fields from the request body so they don't need a separate save step
  if (typeof body.financeCreditTerms === "string" && body.financeCreditTerms.trim()) {
    cus.financeCreditTerms = body.financeCreditTerms.trim();
  }
  if (typeof body.financeCreditLimit === "string" && body.financeCreditLimit.trim()) {
    cus.financeCreditLimit = body.financeCreditLimit.trim();
  }

  // Fetch the current CIS values that will be overwritten so we can store a before snapshot
  const [currentCis] = await db
    .select({
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
      deliveryLandmarks: cisSubmissions.deliveryLandmarks,
      deliveryMobile: cisSubmissions.deliveryMobile,
      deliveryTelephone: cisSubmissions.deliveryTelephone,
      corporateName: cisSubmissions.corporateName,
      dateOfBusinessReg: cisSubmissions.dateOfBusinessReg,
      tinNumber: cisSubmissions.tinNumber,
      businessType: cisSubmissions.businessType,
      lineOfBusiness: cisSubmissions.lineOfBusiness,
      lineOfBusinessOther: cisSubmissions.lineOfBusinessOther,
      businessActivity: cisSubmissions.businessActivity,
      businessActivityOther: cisSubmissions.businessActivityOther,
      salesChannel: cisSubmissions.salesChannel,
      paymentTerms: cisSubmissions.paymentTerms,
      owners: cisSubmissions.owners,
      officers: cisSubmissions.officers,
      businessLife: cisSubmissions.businessLife,
      howLongAtAddress: cisSubmissions.howLongAtAddress,
      numberOfBranches: cisSubmissions.numberOfBranches,
      govCertifications: cisSubmissions.govCertifications,
      tradeReferences: cisSubmissions.tradeReferences,
      bankReferences: cisSubmissions.bankReferences,
      achievements: cisSubmissions.achievements,
      otherMerits: cisSubmissions.otherMerits,
      additionalNotes: cisSubmissions.additionalNotes,
      financeCreditTerms: cisSubmissions.financeCreditTerms,
      financeCreditLimit: cisSubmissions.financeCreditLimit,
      // Current doc arrays (needed to append CUS docs)
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
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, cus.cisId))
    .limit(1);

  // Build before snapshot — only include fields that are actually being changed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const beforeSnapshot: Record<string, any> = {};
  if (currentCis) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cusRecord = cus as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cisRecord = currentCis as Record<string, any>;
    for (const { cisField, cusField } of CIS_CHANGE_MAP) {
      if (cusRecord[cusField]) {
        beforeSnapshot[cisField] = cisRecord[cisField] ?? null;
      }
    }
  }

  // Apply approved changes back to the CIS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cisUpdates: Record<string, any> = { updatedAt: new Date() };
  if (cus.financeCreditTerms) cisUpdates.financeCreditTerms = cus.financeCreditTerms;
  if (cus.financeCreditLimit) cisUpdates.financeCreditLimit = cus.financeCreditLimit;
  if (cus.newTradeName) cisUpdates.tradeName = cus.newTradeName;
  if (cus.newContactPerson) cisUpdates.contactPerson = cus.newContactPerson;
  if (cus.newContactNumber) cisUpdates.contactNumber = cus.newContactNumber;
  if (cus.newTelephoneNumber) cisUpdates.telephoneNumber = cus.newTelephoneNumber;
  if (cus.newEmailAddress) cisUpdates.emailAddress = cus.newEmailAddress;
  if (cus.newWebsite) cisUpdates.website = cus.newWebsite;
  if (cus.newNumberOfEmployees) cisUpdates.numberOfEmployees = cus.newNumberOfEmployees;
  if (cus.newCustomerType) cisUpdates.customerType = cus.newCustomerType;
  if (cus.newBusinessAddress) cisUpdates.businessAddress = cus.newBusinessAddress;
  if (cus.newCityMunicipality) cisUpdates.cityMunicipality = cus.newCityMunicipality;
  if (cus.newLandmarks) cisUpdates.landmarks = cus.newLandmarks;
  if (cus.newDeliveryAddress) cisUpdates.deliveryAddress = cus.newDeliveryAddress;
  if (cus.newDeliveryLandmarks) cisUpdates.deliveryLandmarks = cus.newDeliveryLandmarks;
  if (cus.newDeliveryMobile) cisUpdates.deliveryMobile = cus.newDeliveryMobile;
  if (cus.newDeliveryTelephone) cisUpdates.deliveryTelephone = cus.newDeliveryTelephone;
  if (cus.newCorporateName) cisUpdates.corporateName = cus.newCorporateName;
  if (cus.newDateOfBusinessReg) cisUpdates.dateOfBusinessReg = cus.newDateOfBusinessReg;
  if (cus.newTinNumber) cisUpdates.tinNumber = cus.newTinNumber;
  if (cus.newBusinessType) cisUpdates.businessType = cus.newBusinessType;
  if (cus.newLineOfBusiness) cisUpdates.lineOfBusiness = cus.newLineOfBusiness;
  if (cus.newLineOfBusinessOther) cisUpdates.lineOfBusinessOther = cus.newLineOfBusinessOther;
  if (cus.newBusinessActivity) cisUpdates.businessActivity = cus.newBusinessActivity;
  if (cus.newBusinessActivityOther) cisUpdates.businessActivityOther = cus.newBusinessActivityOther;
  if (cus.newSalesChannel) cisUpdates.salesChannel = cus.newSalesChannel;
  if (cus.newPaymentTerms) cisUpdates.paymentTerms = cus.newPaymentTerms;
  if (Array.isArray(cus.newOwners) && cus.newOwners.length > 0) cisUpdates.owners = cus.newOwners;
  if (Array.isArray(cus.newOfficers) && cus.newOfficers.length > 0) cisUpdates.officers = cus.newOfficers;
  if (cus.newBusinessLife) cisUpdates.businessLife = cus.newBusinessLife;
  if (cus.newHowLongAtAddress) cisUpdates.howLongAtAddress = cus.newHowLongAtAddress;
  if (cus.newNumberOfBranches) cisUpdates.numberOfBranches = cus.newNumberOfBranches;
  if (cus.newGovCertifications) cisUpdates.govCertifications = cus.newGovCertifications;
  if (Array.isArray(cus.newTradeReferences) && cus.newTradeReferences.length > 0) cisUpdates.tradeReferences = cus.newTradeReferences;
  if (Array.isArray(cus.newBankReferences) && cus.newBankReferences.length > 0) cisUpdates.bankReferences = cus.newBankReferences;
  if (cus.newAchievements) cisUpdates.achievements = cus.newAchievements;
  if (cus.newOtherMerits) cisUpdates.otherMerits = cus.newOtherMerits;
  if (cus.newAdditionalNotes) cisUpdates.additionalNotes = cus.newAdditionalNotes;

  // Append CUS documents to the corresponding CIS doc arrays
  if (currentCis) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cusRecord = cus as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cisRecord = currentCis as Record<string, any>;
    for (const field of DOC_FIELDS) {
      const cusFiles = Array.isArray(cusRecord[field]) ? cusRecord[field] : [];
      if (cusFiles.length > 0) {
        const cisFiles = Array.isArray(cisRecord[field]) ? cisRecord[field] : [];
        cisUpdates[field] = [...cisFiles, ...cusFiles];
      }
    }
  }

  // Advance to approved and persist before snapshot
  await db
    .update(cusSubmissions)
    .set({
      status: "approved",
      beforeSnapshot: Object.keys(beforeSnapshot).length > 0 ? beforeSnapshot : null,
      updatedAt: new Date(),
    })
    .where(eq(cusSubmissions.id, id));

  if (Object.keys(cisUpdates).length > 1) {
    await db.update(cisSubmissions).set(cisUpdates).where(eq(cisSubmissions.id, cus.cisId));
  }

  // Workflow event
  await db.insert(cusEvents).values({
    cusId: id,
    actorId: userId,
    action: "approved",
    note: typeof body.note === "string" ? body.note.trim() || null : null,
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
    message: `Customer Update Sheet for ${tradeName} has been approved`,
    status: "pending",
  });

  return NextResponse.json({ ok: true });
}
