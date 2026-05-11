import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents, users } from "@/lib/db/schema";
import { CisInfoCard } from "@/components/cis-info-card";
import { AuditTimeline } from "@/components/audit-timeline";
import { DismissButton } from "@/components/dismiss-button";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { WorkflowHandoff } from "@/components/workflow-handoff";
import { AgentFillOutForm } from "@/components/actions/agent-fill-out-form";
import { AgentResubmitForm } from "@/components/actions/agent-resubmit-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, History } from "lucide-react";
import { CusApprovedBanner } from "@/components/cus-approved-banner";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { RejectedDocsSummary } from "@/components/rejected-docs-summary";
import type { DocReviewStatuses, DocType, FileEntry } from "@/lib/doc-types";
import { getCusFieldHistory } from "@/lib/cus-field-history";

export default async function AgentCisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const agentUser = await db
    .select({ managerId: users.managerId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .then((r) => r[0]);

  const managerName = agentUser?.managerId
    ? await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, agentUser.managerId))
        .limit(1)
        .then((r) => r[0]?.fullName ?? null)
    : null;

  const [cisRows, events] = await Promise.all([
    db
      .select({
        id: cisSubmissions.id,
        publicToken: cisSubmissions.publicToken,
        agentId: cisSubmissions.agentId,
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
      docIsoCertification: cisSubmissions.docIsoCertification,
      docHalalCertificate: cisSubmissions.docHalalCertificate,
        docCertifications: cisSubmissions.docCertifications,
        docOther: cisSubmissions.docOther,
        docAgentOtherRequirements: cisSubmissions.docAgentOtherRequirements,
        docSalesSupportOther: cisSubmissions.docSalesSupportOther,
        isArchived: cisSubmissions.isArchived,
        createdAt: cisSubmissions.createdAt,
        updatedAt: cisSubmissions.updatedAt,
        agentAccountSpecialistFirst: cisSubmissions.agentAccountSpecialistFirst,
        agentAccountSpecialistLast: cisSubmissions.agentAccountSpecialistLast,
        agentSalesSpecialist: cisSubmissions.agentSalesSpecialist,
        agentSalesManager: cisSubmissions.agentSalesManager,
        agentTpcFirst: cisSubmissions.agentTpcFirst,
        agentTpcLast: cisSubmissions.agentTpcLast,
        financeEu: cisSubmissions.financeEu,
        financeDl: cisSubmissions.financeDl,
        financeDr: cisSubmissions.financeDr,
        financePlTs: cisSubmissions.financePlTs,
        financePossiblePoints: cisSubmissions.financePossiblePoints,
        financeApprovedPoints: cisSubmissions.financeApprovedPoints,
        financeCreditLimit: cisSubmissions.financeCreditLimit,
        financeCreditTerms: cisSubmissions.financeCreditTerms,
        docSirRestySigned: cisSubmissions.docSirRestySigned,
        salesSupportAccountType: cisSubmissions.salesSupportAccountType,
        salesSupportPriceList1: cisSubmissions.salesSupportPriceList1,
        salesSupportPriceList2: cisSubmissions.salesSupportPriceList2,
        salesSupportSalesType: cisSubmissions.salesSupportSalesType,
        salesSupportVatCode: cisSubmissions.salesSupportVatCode,
        salesSupportOtherRemarks: cisSubmissions.salesSupportOtherRemarks,
        docReviewStatuses: cisSubmissions.docReviewStatuses,
        financeMetricPoints: cisSubmissions.financeMetricPoints,
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
  if (cis.agentId !== session.user.id) notFound();
  if (cis.status === "draft") redirect(`/agent/new?id=${id}`);

  const canAgentUploadDocs =
    session.user.id === cis.agentId &&
    !["denied", "erp_encoded"].includes(cis.status);

  const returnedEvent = events.findLast((e) => e.action === "returned");
  const deniedEvent = events.findLast((e) => e.action === "denied");

  // Determine who returned the form for custom messaging
  let returnedBy: string | null = null;
  let isFinanceOrLegalReturn = false;
  if (cis.status === "returned" && returnedEvent) {
    if (returnedEvent.actorRole === "finance_reviewer") {
      returnedBy = "Finance";
      isFinanceOrLegalReturn = true;
    } else if (returnedEvent.actorRole === "legal_approver") {
      returnedBy = "Legal";
      isFinanceOrLegalReturn = true;
    } else if (returnedEvent.actorRole === "sales_manager" || returnedEvent.actorRole === "rsr_manager") {
      returnedBy = "Manager";
    }
  }

  const rejectedDocsForSummary = cis.status === "returned"
    ? (() => {
        const statuses = (cis.docReviewStatuses as DocReviewStatuses | null) ?? {};
        const globalCutoff = returnedEvent?.createdAt ? new Date(returnedEvent.createdAt).getTime() : null;

        return (Object.entries(statuses) as [DocType, { status: string; reason?: string | null; rejectedAt?: string | null }][])
          .filter(([, value]) => value?.status === "rejected")
          .filter(([key, value]) => {
            // Use per-doc rejectedAt as cutoff (same logic as agent-doc-section).
            // This prevents a doc rejected in a previous round — and already replaced —
            // from re-appearing in the summary when a different doc gets rejected later.
            const cutoff = value?.rejectedAt
              ? Date.parse(value.rejectedAt)
              : globalCutoff;
            if (cutoff === null || Number.isNaN(cutoff)) return true;
            const files = ((cis as Record<string, unknown>)[key] as FileEntry[] | null | undefined) ?? [];
            return !files.some((file) => {
              if (!file.uploadedAt) return false;
              const uploadedAt = Date.parse(file.uploadedAt);
              return !Number.isNaN(uploadedAt) && uploadedAt > cutoff;
            });
          })
          .map(([key, value]) => ({ key, reason: value?.reason }));
      })()
    : [];

  const canResubmitReturnedForm = cis.status === "returned"
    ? (() => {
        const statuses = (cis.docReviewStatuses as DocReviewStatuses | null) ?? {};
        const rejectedKeys = (Object.entries(statuses) as [DocType, { status: string; reason?: string | null }][])
          .filter(([, value]) => value?.status === "rejected")
          .map(([key]) => key);

        if (rejectedKeys.length === 0) return true;

        const cutoff = returnedEvent?.createdAt ? new Date(returnedEvent.createdAt).getTime() : null;
        if (cutoff === null || Number.isNaN(cutoff)) return false;

        return rejectedKeys.some((key) => {
          const files = ((cis as Record<string, unknown>)[key] as FileEntry[] | null | undefined) ?? [];
          return files.some((file) => {
            if (!file.uploadedAt) return false;
            const uploadedAt = Date.parse(file.uploadedAt);
            return !Number.isNaN(uploadedAt) && uploadedAt > cutoff;
          });
        });
      })()
    : false;

  const fieldHistory = await getCusFieldHistory(cis.id);

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[{ label: "My Submissions", href: "/agent" }, { label: cis.tradeName?.trim() || "Form Details" }]}
        className="print:hidden"
      />

      {/* Status banners */}
      {(cis.status === "returned" || cis.status === "denied") && (
        <div
          className={`print:hidden flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:px-5 ${
            cis.status === "returned"
              ? "border-rose-200 bg-rose-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <AlertTriangle
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              cis.status === "returned" ? "text-rose-500" : "text-red-500"
            }`}
          />
          <div>
            <p
              className={`text-sm font-semibold ${
                cis.status === "returned" ? "text-rose-700" : "text-red-700"
              }`}
            >
              {cis.status === "returned"
                ? `This form was returned by ${returnedBy ?? "a reviewer"}`
                : "This form was not approved"}
            </p>
            {cis.status === "returned" && isFinanceOrLegalReturn && (
              <p className="mt-1 text-xs text-rose-600">
                This is likely due to document issues or incomplete information.
              </p>
            )}
            {(returnedEvent?.note || deniedEvent?.note) && (
              <p
                className={`mt-1 text-sm ${
                  cis.status === "returned" ? "text-rose-600" : "text-red-600"
                }`}
              >
                {returnedEvent?.note ?? deniedEvent?.note}
              </p>
            )}
            {cis.status === "returned" && (
              <p className="mt-1.5 text-xs text-rose-500">
                Review the documents and denial reason above, fix any issues, then use the Resubmit button below.
              </p>
            )}
          </div>
          <div className="shrink-0 self-start sm:ml-auto">
            <DismissButton cisId={cis.id} />
          </div>
        </div>
      )}

      {/* Rejected documents summary — shown when form is returned and docs have been rejected */}
      {cis.status === "returned" && <RejectedDocsSummary rejectedDocs={rejectedDocsForSummary} />}

      {/* Agent fill-out prompt — shown when customer has submitted but agent hasn't filled out */}
      {cis.status === "submitted" && (
        <AgentFillOutForm
          cisId={cis.id}
          initialCustomerType={cis.customerType ?? ""}
          initialOtherRequirements={(cis.docAgentOtherRequirements as any) ?? []}
          tradeName={cis.tradeName}
          managerName={managerName}
        />
      )}

      <CusApprovedBanner
        cisId={cis.id}
        originalCreditTerms={cis.financeCreditTerms}
        originalCreditLimit={cis.financeCreditLimit}
        hrefPrefix="agent"
      />
      {/* Two-column layout */}
      <div className="grid gap-5 xl:grid-cols-5">
        {/* Main */}
        <div className="space-y-5 xl:col-span-3 print:col-span-full">
          <CisInfoCard
            fieldHistory={fieldHistory ?? undefined}
            cisId={cis.id}
            pointsMode="summary"
            tradeName={cis.tradeName}
            contactPerson={cis.contactPerson}
            contactNumber={cis.contactNumber}
            emailAddress={cis.emailAddress}
            businessAddress={cis.businessAddress}
            cityMunicipality={cis.cityMunicipality}
            businessType={cis.businessType}
            tinNumber={cis.tinNumber}
            additionalNotes={cis.additionalNotes}
            customerType={cis.customerType}
            salesChannel={cis.salesChannel}
            agentCode={cis.agentCode}
            agentType={cis.agentType}
            status={cis.status as any}
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
            docIsoCertification={cis.docIsoCertification}
            docHalalCertificate={cis.docHalalCertificate}
            docCertifications={cis.docCertifications}
            docOther={cis.docOther}
            docAgentOtherRequirements={cis.docAgentOtherRequirements}
            docSalesSupportOther={cis.docSalesSupportOther}
            agentAccountSpecialistFirst={cis.agentAccountSpecialistFirst}
            agentAccountSpecialistLast={cis.agentAccountSpecialistLast}
            agentSalesSpecialist={cis.agentSalesSpecialist}
            agentSalesManager={cis.agentSalesManager}
            agentTpcFirst={cis.agentTpcFirst}
            agentTpcLast={cis.agentTpcLast}
            financeEu={cis.financeEu}
            financeDl={cis.financeDl}
            financeDr={cis.financeDr}
            financePlTs={cis.financePlTs}
            financePossiblePoints={cis.financePossiblePoints}
            financeApprovedPoints={cis.financeApprovedPoints}
            financeCreditLimit={cis.financeCreditLimit}
            financeCreditTerms={cis.financeCreditTerms}
            docSirRestySigned={cis.docSirRestySigned}
            salesSupportAccountType={cis.salesSupportAccountType}
            salesSupportPriceList1={cis.salesSupportPriceList1}
            salesSupportPriceList2={cis.salesSupportPriceList2}
            salesSupportSalesType={cis.salesSupportSalesType}
            salesSupportVatCode={cis.salesSupportVatCode}
            salesSupportOtherRemarks={cis.salesSupportOtherRemarks}
            docReviewStatuses={(cis.docReviewStatuses as any) ?? {}}
            metricPoints={(cis.financeMetricPoints as any) ?? undefined}
            agentUpload={canAgentUploadDocs ? { cisId: cis.id, rejectionTimestamp: returnedEvent?.createdAt ?? null } : undefined}
          />
        </div>

        {/* Sidebar */}
        <div className="print:hidden space-y-5 xl:col-span-2 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
          <WorkflowStepper status={cis.status as any} customerType={cis.customerType} events={events as any} cisCreatedAt={cis.createdAt} />
          <WorkflowHandoff status={cis.status as any} customerType={cis.customerType} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-zinc-700">
                <History className="h-4 w-4 text-zinc-400" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTimeline events={events as any} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Agent resubmit — at the bottom after the form content */}
      {cis.status === "returned" && (
        <AgentResubmitForm
          cisId={cis.id}
          returnedBy={returnedBy}
          canResubmit={canResubmitReturnedForm}
        />
      )}
    </div>
  );
}
