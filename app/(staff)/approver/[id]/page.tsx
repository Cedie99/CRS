import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents, users } from "@/lib/db/schema";
import { CisInfoCard } from "@/components/cis-info-card";
import { AuditTimeline, type WorkflowAction } from "@/components/audit-timeline";
import { ApproverActions } from "@/components/actions/approver-actions";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { WorkflowHandoff } from "@/components/workflow-handoff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, History } from "lucide-react";
import { CusApprovedBanner } from "@/components/cus-approved-banner";
import type { FileEntry } from "@/lib/doc-types";
import type { CisStatus } from "@/components/status-badge";

export default async function ApproverCisDetailPage({
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

  const canAct = cis.status === "pending_approval" && !isReadOnlyContextView;
  const typedEvents = events as Array<{
    id: string;
    action: WorkflowAction;
    note: string | null;
    createdAt: Date;
    actorName: string;
    actorRole: string | null;
    actorAvatarUrl: string | null;
  }>;
  const needsPhysicalSignature = ((cis.docSirRestySigned as FileEntry[] | null) ?? []).length === 0;
  const canPrint = needsPhysicalSignature || cis.status === "erp_encoded";

  return (
    <div className="space-y-5">
      <Link
        href={isReadOnlyContextView ? "/approver?view=all" : "/approver"}
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
        hrefPrefix="approver"
      />

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3 print:col-span-full">
          <CisInfoCard
            printEnabled={canPrint}
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
            status={cis.status as CisStatus}
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
            docSirRestySigned={cis.docSirRestySigned}
            docOther={cis.docOther}
            financePlTs={cis.financePlTs}
            financePossiblePoints={cis.financePossiblePoints}
            financeApprovedPoints={cis.financeApprovedPoints}
            financeCreditLimit={cis.financeCreditLimit}
            financeCreditTerms={cis.financeCreditTerms}
            financeEu={cis.financeEu}
            financeDl={cis.financeDl}
            financeDr={cis.financeDr}
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
            docReviewStatuses={(cis.docReviewStatuses as any) ?? {}}
            metricPoints={(cis.financeMetricPoints as any) ?? undefined}
          />
        </div>

        <div className="print:hidden space-y-5 xl:col-span-2 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
          <WorkflowStepper status={cis.status as CisStatus} customerType={cis.customerType} events={events as any} cisCreatedAt={cis.createdAt} />
          <WorkflowHandoff status={cis.status as CisStatus} customerType={cis.customerType} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-zinc-700">
                <History className="h-4 w-4 text-zinc-400" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTimeline events={typedEvents} />
            </CardContent>
          </Card>
        </div>
      </div>

      {canAct && <ApproverActions cisId={id} />}
    </div>
  );
}
