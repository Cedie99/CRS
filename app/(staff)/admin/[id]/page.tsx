import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents, users } from "@/lib/db/schema";
import { CisInfoCard } from "@/components/cis-info-card";
import { AuditTimeline } from "@/components/audit-timeline";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { WorkflowHandoff } from "@/components/workflow-handoff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { CusApprovedBanner } from "@/components/cus-approved-banner";
import { DeleteCisZone } from "@/components/admin/delete-cis-button";
import { getCusFieldHistory } from "@/lib/cus-field-history";

export default async function AdminCisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const [cis] = await db
    .select()
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) notFound();

  const events = await db
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
    .orderBy(workflowEvents.createdAt);

  const fieldHistory = await getCusFieldHistory(cis.id);

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[{ label: "All Submissions", href: "/admin" }, { label: cis.tradeName?.trim() || "Form Details" }]}
        className="print:hidden"
      />


      <CusApprovedBanner
        cisId={cis.id}
      />

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="min-w-0 space-y-5 xl:col-span-3 print:col-span-full">
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
            customerCode={cis.customerCode}
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
            financePossiblePoints={cis.financePossiblePoints}
            financeApprovedPoints={cis.financeApprovedPoints}
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
            docReviewStatuses={(cis.docReviewStatuses as any) ?? {}}
            metricPoints={(cis.financeMetricPoints as any) ?? undefined}
          />
          <div className="print:hidden">
            <DeleteCisZone cisId={cis.id} tradeName={cis.tradeName} />
          </div>
        </div>

        <div className="print:hidden min-w-0 space-y-5 xl:col-span-2 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
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
    </div>
  );
}
