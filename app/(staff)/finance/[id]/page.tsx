import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents, users } from "@/lib/db/schema";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CusApprovedBanner } from "@/components/cus-approved-banner";
import { FinanceCisDetailClient } from "./finance-cis-detail-client";
import { SCORING_DOC_KEYS } from "@/lib/doc-types";
import { getCusFieldHistory } from "@/lib/cus-field-history";

export default async function FinanceCisDetailPage({
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
      .select()
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

  const canAct = cis.status === "pending_finance_review" && !isReadOnlyContextView;

  // Initial printEnabled for SSR — client recomputes this live after doc reviews.
  // Only gated on document reviews; credit limit/terms are filled physically by CFO.
  const REVIEWED_STATUSES = new Set(["approved", "rejected", "needs_review"]);
  const reviewStatuses = (cis.docReviewStatuses as Record<string, { status: string }> | null) ?? {};
  const hasPendingDocReviews = SCORING_DOC_KEYS.some((field) => {
    const val = (cis as Record<string, unknown>)[field];
    const uploaded = Array.isArray(val) && val.length > 0;
    return uploaded && !REVIEWED_STATUSES.has(reviewStatuses[field]?.status);
  });

  const fieldHistory = await getCusFieldHistory(cis.id);

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: "Finance Review Queue", href: isReadOnlyContextView ? "/finance?view=all" : "/finance" },
          { label: cis.tradeName?.trim() || "Form Details" },
        ]}
        className="print:hidden"
      />

      {isReadOnlyContextView && (
        <div className="print:hidden rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Context view enabled: this record is read-only from All Submissions mode.
        </div>
      )}


      <CusApprovedBanner
        cisId={cis.id}
        hrefPrefix="finance"
      />

      <FinanceCisDetailClient
        fieldHistory={fieldHistory ?? undefined}
        cisId={cis.id}
        initialDocReviewStatuses={(cis.docReviewStatuses as any) ?? {}}
        canAct={canAct}
        printEnabled={!hasPendingDocReviews}
        isReadOnlyContextView={isReadOnlyContextView}
        dashboardPath="/finance"
        events={events as any}
        status={cis.status}
        customerType={cis.customerType}
        salesChannel={cis.salesChannel}
        agentType={cis.agentType}
        initialSirRestyFiles={(cis.docSirRestySigned as any) ?? []}
        initialMetricPoints={(cis.financeMetricPoints as any) ?? null}
        // Doc fields
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
        docGovCertifications={cis.docGovCertifications}
        docOther={cis.docOther}
        financePossiblePoints={cis.financePossiblePoints}
        financeApprovedPoints={cis.financeApprovedPoints}
        // DocReviewPanel fields
        tradeName={cis.tradeName}
        contactPerson={cis.contactPerson}
        contactNumber={cis.contactNumber}
        emailAddress={cis.emailAddress}
        businessAddress={cis.businessAddress}
        cityMunicipality={cis.cityMunicipality}
        postalCode={cis.postalCode}
        businessType={cis.businessType}
        tinNumber={cis.tinNumber}
        additionalNotes={cis.additionalNotes}
        agentCode={cis.agentCode}
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
        docAgentOtherRequirements={cis.docAgentOtherRequirements}
        docSalesSupportOther={cis.docSalesSupportOther}
        financeEu={cis.financeEu}
        financeDl={cis.financeDl}
        financeDr={cis.financeDr}
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
