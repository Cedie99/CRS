"use client";

import { useState, useCallback } from "react";
import { toast } from "@/lib/toast";
import { DocReviewPanel } from "@/components/doc-review-panel";
import { AuditTimeline } from "@/components/audit-timeline";
import { FinanceActions } from "@/components/actions/finance-actions";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { WorkflowHandoff } from "@/components/workflow-handoff";
import { PointsBreakdownPanel } from "@/components/points-breakdown-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { SCORING_DOC_KEYS } from "@/lib/doc-types";
import type { DocReviewStatuses } from "@/lib/doc-types";

interface FinanceCisDetailClientProps {
  cisId: string;
  initialDocReviewStatuses: DocReviewStatuses;
  canAct: boolean;
  printEnabled: boolean;
  isReadOnlyContextView: boolean;
  dashboardPath?: string;
  // CIS data for PointsBreakdownPanel
  docValidId?: unknown;
  docMayorsPermit?: unknown;
  docSecDti?: unknown;
  docBirCertificate?: unknown;
  docLocationMap?: unknown;
  docFinancialStatement?: unknown;
  docBankStatement?: unknown;
  docProofOfBilling?: unknown;
  docLeaseContract?: unknown;
  docProofOfOwnership?: unknown;
  docStorePhoto?: unknown;
  docSupplierInvoice?: unknown;
  docSocialMedia?: unknown;
  docCompanyWebsite?: unknown;
  docIsoCertification?: unknown;
  docHalalCertificate?: unknown;
  docCertifications?: unknown;
  docGovCertifications?: unknown;
  docOther?: unknown;
  financePossiblePoints?: number | null;
  financeApprovedPoints?: number | null;
  initialMetricPoints?: { annualSales?: number | null; netIncome?: number | null; bankBalance?: number | null; businessLife?: number | null } | null;
  agentType?: string | null;
  customerType?: string | null;
  salesChannel?: string | null;
  // Events for timeline
  events: Array<{
    id: string;
    action: string;
    note: string | null;
    createdAt: Date;
    actorName: string | null;
    actorRole: string | null;
    actorAvatarUrl: string | null;
  }>;
  // Workflow props
  status: string;
  // FinanceActions props
  initialSirRestyFiles?: unknown;
  forwardEndpoint?: string;
  denyEndpoint?: string;
  // DocReviewPanel props
  tradeName: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  emailAddress: string | null;
  businessAddress: string | null;
  cityMunicipality: string | null;
  postalCode?: string | null;
  businessType: string | null;
  tinNumber: string | null;
  additionalNotes: string | null;
  agentCode: string;
  createdAt: Date;
  updatedAt: Date;
  customerSignature?: string | null;
  customerSignedAt?: Date | null;
  customerSignatureSeal?: string | null;
  approverSignature?: string | null;
  approverSignedAt?: Date | null;
  approverSignatureSeal?: string | null;
  petroleumLicenseNo?: string | null;
  depotStationType?: string | null;
  tankCapacity?: string | null;
  doeAccreditationNo?: string | null;
  specialAccountType?: string | null;
  specialAccountRemarks?: string | null;
  paymentTerms?: string | null;
  corporateName?: string | null;
  dateOfBusinessReg?: string | null;
  numberOfEmployees?: string | null;
  website?: string | null;
  telephoneNumber?: string | null;
  landmarks?: string | null;
  deliverySameAsOffice?: boolean | null;
  deliveryAddress?: string | null;
  deliveryLandmarks?: string | null;
  deliveryMobile?: string | null;
  deliveryTelephone?: string | null;
  lineOfBusiness?: string | null;
  lineOfBusinessOther?: string | null;
  businessActivity?: string | null;
  businessActivityOther?: string | null;
  owners?: unknown;
  officers?: unknown;
  businessLife?: string | null;
  howLongAtAddress?: string | null;
  numberOfBranches?: string | null;
  govCertifications?: string | null;
  tradeReferences?: unknown;
  bankReferences?: unknown;
  achievements?: string | null;
  otherMerits?: string | null;
  docAgentOtherRequirements?: unknown;
  docSalesSupportOther?: unknown;
  financeEu?: string | null;
  financeDl?: string | null;
  financeDr?: string | null;
  financeCreditLimit?: string | null;
  financeCreditTerms?: string | null;
  docSirRestySigned?: unknown;
  agentAccountSpecialistFirst?: string | null;
  agentAccountSpecialistLast?: string | null;
  agentSalesSpecialist?: string | null;
  agentSalesManager?: string | null;
  agentTpcFirst?: string | null;
  agentTpcLast?: string | null;
  salesSupportAccountType?: string | null;
  salesSupportPriceList1?: string | null;
  salesSupportPriceList2?: string | null;
  salesSupportSalesType?: string | null;
  salesSupportVatCode?: string | null;
  salesSupportOtherRemarks?: string | null;
  fieldHistory?: Record<string, string | null>;
}

const REVIEWED_STATUSES = new Set(["approved", "rejected", "needs_review"]);

export function FinanceCisDetailClient({
  cisId,
  initialDocReviewStatuses,
  canAct,
  printEnabled: _initialPrintEnabled,
  isReadOnlyContextView,
  dashboardPath = "/finance",
  events,
  status,
  customerType,
  salesChannel,
  initialSirRestyFiles,
  forwardEndpoint,
  denyEndpoint,
  initialMetricPoints,
  ...cisData
}: FinanceCisDetailClientProps) {
  const [docReviewStatuses, setDocReviewStatuses] = useState<DocReviewStatuses>(initialDocReviewStatuses);
  const [metricPoints, setMetricPoints] = useState(initialMetricPoints ?? {});
  const latestReturnedAt = events.findLast((e) => e.action === "returned")?.createdAt ?? null;
  const rejectionCutoff = latestReturnedAt ? new Date(latestReturnedAt).getTime() : null;
  const hasUnresolvedRejections = Object.entries(docReviewStatuses).some(([docType, review]) => {
    if (review?.status !== "rejected") return false;
    // Use per-doc rejectedAt if available; fall back to global rejectionCutoff.
    const cutoff = review.rejectedAt ? Date.parse(review.rejectedAt) : rejectionCutoff;
    if (cutoff === null || Number.isNaN(cutoff)) return true;
    const files = (cisData as Record<string, unknown>)[docType];
    if (!Array.isArray(files) || files.length === 0) return true;
    return !files.some((f: { uploadedAt?: string }) => {
      const t = f.uploadedAt ? Date.parse(f.uploadedAt) : NaN;
      return !Number.isNaN(t) && t > cutoff;
    });
  });

  // Recompute printEnabled from live docReviewStatuses so it updates without a page refresh.
  // Only gated on document reviews — credit limit/terms are filled physically by CFO.
  const hasPendingDocReviews = SCORING_DOC_KEYS.some((field) => {
    const val = (cisData as Record<string, unknown>)[field];
    if (!Array.isArray(val) || val.length === 0) return false;
    const status = docReviewStatuses[field]?.status;
    if (!REVIEWED_STATUSES.has(status as string)) return true;
    // A rejected doc with a new replacement uploaded after its own rejection timestamp
    // is effectively unreviewed — the replacement needs a fresh decision.
    if (status === "rejected") {
      const review = docReviewStatuses[field];
      const cutoff = review?.rejectedAt ? Date.parse(review.rejectedAt) : rejectionCutoff;
      if (cutoff !== null && !Number.isNaN(cutoff)) {
        const hasNewFile = (val as { uploadedAt?: string }[]).some((f) => {
          const t = f.uploadedAt ? Date.parse(f.uploadedAt) : NaN;
          return !Number.isNaN(t) && t > cutoff;
        });
        if (hasNewFile) return true;
      }
    }
    return false;
  });
  const printEnabled = !hasPendingDocReviews;

  function handleStatusesChange(statuses: DocReviewStatuses) {
    setDocReviewStatuses(statuses);
  }

  const handleMetricSave = useCallback(async (pts: Record<string, number>) => {
    const res = await fetch(`/api/cis/${cisId}/finance-save`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metricPoints: pts }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error({ title: data?.error ?? "Failed to save points" });
      return;
    }
    toast.success({ title: "Points saved successfully" });
    setMetricPoints((prev) => ({ ...prev, ...pts }));
  }, [cisId]);

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-5">
        <div className="min-w-0 space-y-5 xl:col-span-3 print:col-span-full">
          <DocReviewPanel
            initialDocReviewStatuses={initialDocReviewStatuses}
            canAct={canAct}
            printEnabled={printEnabled}
            hidePrintButton
            hidePointsPanel
            printCreditFields
            onStatusesChange={handleStatusesChange}
            onMetricSave={canAct ? handleMetricSave : undefined}
            reviewRejectionTimestamp={latestReturnedAt}
            cisId={cisId}
            status={status as any}
            customerType={customerType}
            salesChannel={salesChannel}
            agentType={cisData.agentType ?? null}
            metricPoints={metricPoints}
            {...cisData}
          />
        </div>

        <div className="print:hidden min-w-0 space-y-5 xl:col-span-2 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
          <WorkflowStepper status={status as any} customerType={customerType} events={events as any} cisCreatedAt={cisData.createdAt as any} />
          <WorkflowHandoff status={status as any} customerType={customerType} agentType={cisData.agentType} />

          <PointsBreakdownPanel
            docValidId={cisData.docValidId}
            docMayorsPermit={cisData.docMayorsPermit}
            docSecDti={cisData.docSecDti}
            docBirCertificate={cisData.docBirCertificate}
            docLocationMap={cisData.docLocationMap}
            docFinancialStatement={cisData.docFinancialStatement}
            docBankStatement={cisData.docBankStatement}
            docProofOfBilling={cisData.docProofOfBilling}
            docLeaseContract={cisData.docLeaseContract}
            docProofOfOwnership={cisData.docProofOfOwnership}
            docStorePhoto={cisData.docStorePhoto}
            docSupplierInvoice={cisData.docSupplierInvoice}
            docSocialMedia={cisData.docSocialMedia}
            docCompanyWebsite={cisData.docCompanyWebsite}
            docIsoCertification={cisData.docIsoCertification}
            docHalalCertificate={cisData.docHalalCertificate}
            financePossiblePoints={cisData.financePossiblePoints}
            financeApprovedPoints={cisData.financeApprovedPoints}
            metricPoints={metricPoints}
            docReviewStatuses={docReviewStatuses}
            agentType={cisData.agentType}
            customerType={customerType}
            showApprovedAlways={canAct}
          />
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

      {canAct && (
        <FinanceActions
          cisId={cisId}
          initialSirRestyFiles={initialSirRestyFiles as any}
          initialCreditTerms={cisData.financeCreditTerms ?? ""}
          initialCreditLimit={cisData.financeCreditLimit ?? ""}
          forwardEndpoint={forwardEndpoint}
          denyEndpoint={denyEndpoint}
          dashboardPath={dashboardPath}
          printEnabled={printEnabled}
          docReviewStatuses={docReviewStatuses}
          hasUnresolvedRejections={hasUnresolvedRejections}
          hasUnreviewedDocs={hasPendingDocReviews}
        />
      )}
    </>
  );
}
