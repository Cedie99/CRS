import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents, users } from "@/lib/db/schema";
import { ArrowLeft } from "lucide-react";
import { CusApprovedBanner } from "@/components/cus-approved-banner";
import { SCORING_DOC_KEYS } from "@/lib/doc-types";
import { LegalCisDetailClient } from "./legal-cis-detail-client";

export default async function LegalCisDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const { view } = await searchParams;
  const isReadOnlyContextView = view === "all";

  const [cisRows, events] = await Promise.all([
    db
      .select({
        id: cisSubmissions.id,
        agentCode: cisSubmissions.agentCode,
        agentType: cisSubmissions.agentType,
        customerType: cisSubmissions.customerType,
        status: cisSubmissions.status,
        tradeName: cisSubmissions.tradeName,
        contactPerson: cisSubmissions.contactPerson,
        contactNumber: cisSubmissions.contactNumber,
        emailAddress: cisSubmissions.emailAddress,
        businessAddress: cisSubmissions.businessAddress,
        cityMunicipality: cisSubmissions.cityMunicipality,
        businessType: cisSubmissions.businessType,
        tinNumber: cisSubmissions.tinNumber,
        additionalNotes: cisSubmissions.additionalNotes,
        createdAt: cisSubmissions.createdAt,
        updatedAt: cisSubmissions.updatedAt,
        customerSignature: cisSubmissions.customerSignature,
        customerSignedAt: cisSubmissions.customerSignedAt,
        customerSignatureSeal: cisSubmissions.customerSignatureSeal,
        approverSignature: cisSubmissions.approverSignature,
        approverSignedAt: cisSubmissions.approverSignedAt,
        approverSignatureSeal: cisSubmissions.approverSignatureSeal,
        petroleumLicenseNo: cisSubmissions.petroleumLicenseNo,
        depotStationType: cisSubmissions.depotStationType,
        tankCapacity: cisSubmissions.tankCapacity,
        doeAccreditationNo: cisSubmissions.doeAccreditationNo,
        specialAccountType: cisSubmissions.specialAccountType,
        specialAccountRemarks: cisSubmissions.specialAccountRemarks,
        paymentTerms: cisSubmissions.paymentTerms,
        salesChannel: cisSubmissions.salesChannel,
        docGovCertifications: cisSubmissions.docGovCertifications,
        corporateName: cisSubmissions.corporateName,
        dateOfBusinessReg: cisSubmissions.dateOfBusinessReg,
        numberOfEmployees: cisSubmissions.numberOfEmployees,
        website: cisSubmissions.website,
        telephoneNumber: cisSubmissions.telephoneNumber,
        landmarks: cisSubmissions.landmarks,
        deliverySameAsOffice: cisSubmissions.deliverySameAsOffice,
        deliveryAddress: cisSubmissions.deliveryAddress,
        deliveryLandmarks: cisSubmissions.deliveryLandmarks,
        deliveryMobile: cisSubmissions.deliveryMobile,
        deliveryTelephone: cisSubmissions.deliveryTelephone,
        lineOfBusiness: cisSubmissions.lineOfBusiness,
        lineOfBusinessOther: cisSubmissions.lineOfBusinessOther,
        businessActivity: cisSubmissions.businessActivity,
        businessActivityOther: cisSubmissions.businessActivityOther,
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
        docCertifications: cisSubmissions.docCertifications,
        docOther: cisSubmissions.docOther,
        docAgentOtherRequirements: cisSubmissions.docAgentOtherRequirements,
        docSalesSupportOther: cisSubmissions.docSalesSupportOther,
        financeEu: cisSubmissions.financeEu,
        financeDl: cisSubmissions.financeDl,
        financeDr: cisSubmissions.financeDr,
        financePlTs: cisSubmissions.financePlTs,
        financePossiblePoints: cisSubmissions.financePossiblePoints,
        financeApprovedPoints: cisSubmissions.financeApprovedPoints,
        financeMetricPoints: cisSubmissions.financeMetricPoints,
        financeCreditTerms: cisSubmissions.financeCreditTerms,
        docSirRestySigned: cisSubmissions.docSirRestySigned,
        agentAccountSpecialistFirst: cisSubmissions.agentAccountSpecialistFirst,
        agentAccountSpecialistLast: cisSubmissions.agentAccountSpecialistLast,
        agentSalesSpecialist: cisSubmissions.agentSalesSpecialist,
        agentSalesManager: cisSubmissions.agentSalesManager,
        agentTpcFirst: cisSubmissions.agentTpcFirst,
        agentTpcLast: cisSubmissions.agentTpcLast,
        financeCreditLimit: cisSubmissions.financeCreditLimit,
        salesSupportAccountType: cisSubmissions.salesSupportAccountType,
        salesSupportPriceList1: cisSubmissions.salesSupportPriceList1,
        salesSupportPriceList2: cisSubmissions.salesSupportPriceList2,
        salesSupportSalesType: cisSubmissions.salesSupportSalesType,
        salesSupportVatCode: cisSubmissions.salesSupportVatCode,
        salesSupportOtherRemarks: cisSubmissions.salesSupportOtherRemarks,
        docReviewStatuses: cisSubmissions.docReviewStatuses,
      })
      .from(cisSubmissions)
      .where(eq(cisSubmissions.id, id))
      .limit(1),
    db
      .select({
        id: workflowEvents.id,
        action: workflowEvents.action,
        note: workflowEvents.note,
        createdAt: workflowEvents.createdAt,
        actorName: users.fullName,
        actorRole: users.role,
        actorAvatarUrl: users.avatarUrl,
      })
      .from(workflowEvents)
      .innerJoin(users, eq(workflowEvents.actorId, users.id))
      .where(eq(workflowEvents.cisId, id))
      .orderBy(workflowEvents.createdAt),
  ]);
  const cis = cisRows[0];
  if (!cis) notFound();

  const canAct = cis.status === "pending_legal_review" && !isReadOnlyContextView;

  // Initial printEnabled for SSR — client recomputes this live after doc reviews.
  const REVIEWED_STATUSES = new Set(["approved", "rejected", "needs_review"]);
  const reviewStatuses = (cis.docReviewStatuses as Record<string, { status: string }> | null) ?? {};
  const hasPendingDocReviews = SCORING_DOC_KEYS.some((field) => {
    const val = (cis as Record<string, unknown>)[field];
    const uploaded = Array.isArray(val) && val.length > 0;
    return uploaded && !REVIEWED_STATUSES.has(reviewStatuses[field]?.status);
  });
  const initialPrintEnabled = !hasPendingDocReviews;

  return (
    <div className="space-y-5">
      <Link
        href={isReadOnlyContextView ? "/legal?view=all" : "/legal"}
        className="print:hidden inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to queue
      </Link>

      {isReadOnlyContextView && (
        <div className="print:hidden rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Context view enabled: this record is read-only from All Submissions mode.
        </div>
      )}


      <CusApprovedBanner
        cisId={cis.id}
        originalCreditTerms={cis.financeCreditTerms}
        originalCreditLimit={cis.financeCreditLimit}
        hrefPrefix="legal"
      />

      <LegalCisDetailClient
        cisId={cis.id}
        initialDocReviewStatuses={(cis.docReviewStatuses as any) ?? {}}
        canAct={canAct}
        initialPrintEnabled={initialPrintEnabled}
        isReadOnlyContextView={isReadOnlyContextView}
        forwardEndpoint={`/api/cis/${id}/legal-forward`}
        denyEndpoint={`/api/cis/${id}/legal-deny`}
        initialSirRestyFiles={(cis.docSirRestySigned as any) ?? []}
        events={events as any}
        status={cis.status}
        customerType={cis.customerType}
        agentCode={cis.agentCode}
        agentType={cis.agentType}
        tradeName={cis.tradeName}
        contactPerson={cis.contactPerson}
        contactNumber={cis.contactNumber}
        emailAddress={cis.emailAddress}
        businessAddress={cis.businessAddress}
        cityMunicipality={cis.cityMunicipality}
        businessType={cis.businessType}
        tinNumber={cis.tinNumber}
        additionalNotes={cis.additionalNotes}
        salesChannel={cis.salesChannel}
        createdAt={cis.createdAt}
        updatedAt={cis.updatedAt}
        customerSignature={cis.customerSignature}
        customerSignedAt={cis.customerSignedAt}
        customerSignatureSeal={cis.customerSignatureSeal}
        approverSignature={cis.approverSignature}
        approverSignedAt={cis.approverSignedAt}
        approverSignatureSeal={cis.approverSignatureSeal}
        petroleumLicenseNo={cis.petroleumLicenseNo}
        depotStationType={cis.depotStationType}
        tankCapacity={cis.tankCapacity}
        doeAccreditationNo={cis.doeAccreditationNo}
        specialAccountType={cis.specialAccountType}
        specialAccountRemarks={cis.specialAccountRemarks}
        paymentTerms={cis.paymentTerms}
        docGovCertifications={cis.docGovCertifications}
        corporateName={cis.corporateName}
        dateOfBusinessReg={cis.dateOfBusinessReg}
        numberOfEmployees={cis.numberOfEmployees}
        website={cis.website}
        telephoneNumber={cis.telephoneNumber}
        landmarks={cis.landmarks}
        deliverySameAsOffice={cis.deliverySameAsOffice}
        deliveryAddress={cis.deliveryAddress}
        deliveryLandmarks={cis.deliveryLandmarks}
        deliveryMobile={cis.deliveryMobile}
        deliveryTelephone={cis.deliveryTelephone}
        lineOfBusiness={cis.lineOfBusiness}
        lineOfBusinessOther={cis.lineOfBusinessOther}
        businessActivity={cis.businessActivity}
        businessActivityOther={cis.businessActivityOther}
        owners={cis.owners}
        officers={cis.officers}
        businessLife={cis.businessLife}
        howLongAtAddress={cis.howLongAtAddress}
        numberOfBranches={cis.numberOfBranches}
        govCertifications={cis.govCertifications}
        tradeReferences={cis.tradeReferences}
        bankReferences={cis.bankReferences}
        achievements={cis.achievements}
        otherMerits={cis.otherMerits}
        docValidId={cis.docValidId}
        docMayorsPermit={cis.docMayorsPermit}
        docSecDti={cis.docSecDti}
        docBirCertificate={cis.docBirCertificate}
        docLocationMap={cis.docLocationMap}
        docFinancialStatement={cis.docFinancialStatement}
        docBankStatement={cis.docBankStatement}
        docProofOfBilling={cis.docProofOfBilling}
        docLeaseContract={cis.docLeaseContract}
        docProofOfOwnership={cis.docProofOfOwnership}
        docStorePhoto={cis.docStorePhoto}
        docSupplierInvoice={cis.docSupplierInvoice}
        docSocialMedia={cis.docSocialMedia}
        docCompanyWebsite={cis.docCompanyWebsite}
        docIsoCertification={cis.docIsoCertification}
        docHalalCertificate={cis.docHalalCertificate}
        docCertifications={cis.docCertifications}
        docOther={cis.docOther}
        docAgentOtherRequirements={cis.docAgentOtherRequirements}
        docSalesSupportOther={cis.docSalesSupportOther}
        financeEu={cis.financeEu}
        financeDl={cis.financeDl}
        financeDr={cis.financeDr}
        financePlTs={cis.financePlTs}
        financePossiblePoints={cis.financePossiblePoints}
        financeApprovedPoints={cis.financeApprovedPoints}
        metricPoints={cis.financeMetricPoints as any}
        financeCreditLimit={cis.financeCreditLimit}
        financeCreditTerms={cis.financeCreditTerms}
        docSirRestySigned={cis.docSirRestySigned}
        agentAccountSpecialistFirst={cis.agentAccountSpecialistFirst}
        agentAccountSpecialistLast={cis.agentAccountSpecialistLast}
        agentSalesSpecialist={cis.agentSalesSpecialist}
        agentSalesManager={cis.agentSalesManager}
        agentTpcFirst={cis.agentTpcFirst}
        agentTpcLast={cis.agentTpcLast}
        salesSupportAccountType={cis.salesSupportAccountType}
        salesSupportPriceList1={cis.salesSupportPriceList1}
        salesSupportPriceList2={cis.salesSupportPriceList2}
        salesSupportSalesType={cis.salesSupportSalesType}
        salesSupportVatCode={cis.salesSupportVatCode}
        salesSupportOtherRemarks={cis.salesSupportOtherRemarks}
      />
    </div>
  );
}
