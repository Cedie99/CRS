import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents, users } from "@/lib/db/schema";
import { CisInfoCard } from "@/components/cis-info-card";
import { AuditTimeline } from "@/components/audit-timeline";
import { CopyLinkButton } from "@/components/copy-link-button";
import { DeleteDraftButton } from "@/components/delete-draft-button";
import { DismissButton } from "@/components/dismiss-button";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { WorkflowHandoff } from "@/components/workflow-handoff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, Clock, History } from "lucide-react";

export default async function AgentCisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const [cis] = await db
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
      docCertifications: cisSubmissions.docCertifications,
      docOther: cisSubmissions.docOther,
      isArchived: cisSubmissions.isArchived,
      createdAt: cisSubmissions.createdAt,
      updatedAt: cisSubmissions.updatedAt,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) notFound();
  if (cis.agentId !== session.user.id) notFound();

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

  const returnedEvent = events.findLast((e) => e.action === "returned");
  const deniedEvent = events.findLast((e) => e.action === "denied");

  return (
    <div className="space-y-5">
      <Link
        href="/agent"
        className="print:hidden inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my submissions
      </Link>

      {/* Status banners */}
      {cis.status === "draft" && (
        <div className="print:hidden rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Clock className="h-4 w-4" />
            Waiting for your customer to fill out the form
          </div>
          <p className="text-xs text-amber-600">
            Copy the link below and send it to your customer. Once they complete and submit the form, it will automatically move to the approval process.
          </p>
          <div className="flex items-center gap-2">
            <CopyLinkButton token={cis.publicToken} />
            <DeleteDraftButton cisId={cis.id} />
          </div>
        </div>
      )}

      {(cis.status === "returned" || cis.status === "denied") && (
        <div
          className={`print:hidden flex gap-3 rounded-xl border px-5 py-4 ${
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
                ? "This form was sent back for corrections"
                : "This form was not approved"}
            </p>
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
                To resubmit, create a new customer form and apply the corrections above.
              </p>
            )}
          </div>
          <div className="ml-auto shrink-0 self-start">
            <DismissButton cisId={cis.id} />
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Main */}
        <div className="space-y-5 lg:col-span-3 print:col-span-full">
          <CisInfoCard
            cisId={cis.id}
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
            docCertifications={cis.docCertifications}
            docOther={cis.docOther}
          />
        </div>

        {/* Sidebar */}
        <div className="print:hidden space-y-5 lg:col-span-2">
          <WorkflowStepper status={cis.status as any} customerType={cis.customerType} />
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
