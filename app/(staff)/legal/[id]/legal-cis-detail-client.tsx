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

const REVIEWED_STATUSES = new Set(["approved", "rejected", "needs_review"]);

interface LegalCisDetailClientProps {
  cisId: string;
  initialDocReviewStatuses: DocReviewStatuses;
  canAct: boolean;
  initialPrintEnabled: boolean;
  isReadOnlyContextView: boolean;
  forwardEndpoint?: string;
  denyEndpoint?: string;
  initialSirRestyFiles?: unknown;
  events: Array<{
    id: string;
    action: string;
    note: string | null;
    createdAt: Date;
    actorName: string | null;
    actorRole: string | null;
    actorAvatarUrl: string | null;
  }>;
  status: string;
  customerType?: string | null;
  [key: string]: unknown;
}

export function LegalCisDetailClient({
  cisId,
  initialDocReviewStatuses,
  canAct,
  initialPrintEnabled: _initialPrintEnabled,
  isReadOnlyContextView: _isReadOnlyContextView,
  forwardEndpoint,
  denyEndpoint,
  initialSirRestyFiles,
  events,
  status,
  customerType,
  ...cisData
}: LegalCisDetailClientProps) {
  const [docReviewStatuses, setDocReviewStatuses] = useState<DocReviewStatuses>(initialDocReviewStatuses);
  const [metricPoints, setMetricPoints] = useState<Record<string, number | null | undefined>>((cisData.metricPoints as any) ?? {});
  const latestReturnedAt = events.findLast((e) => e.action === "returned")?.createdAt ?? null;
  const rejectionCutoff = latestReturnedAt ? new Date(latestReturnedAt).getTime() : null;
  const hasUnresolvedRejections = Object.entries(docReviewStatuses).some(([docType, review]) => {
    if (review?.status !== "rejected") return false;
    // Use per-doc rejectedAt if available; fall back to global rejectionCutoff.
    const cutoff = review.rejectedAt ? Date.parse(review.rejectedAt) : rejectionCutoff;
    if (cutoff === null || Number.isNaN(cutoff)) return true;
    const files = cisData[docType];
    if (!Array.isArray(files) || files.length === 0) return true;
    return !files.some((f: { uploadedAt?: string }) => {
      const t = f.uploadedAt ? Date.parse(f.uploadedAt) : NaN;
      return !Number.isNaN(t) && t > cutoff;
    });
  });

  // Recompute printEnabled from live docReviewStatuses so it updates without a page refresh.
  // Only gated on document reviews — credit limit/terms are filled physically by CFO.
  const hasPendingDocReviews = SCORING_DOC_KEYS.some((field) => {
    const val = cisData[field];
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
        <div className="space-y-5 xl:col-span-3 print:col-span-full">
          <DocReviewPanel
            initialDocReviewStatuses={initialDocReviewStatuses}
            canAct={canAct}
            printEnabled={printEnabled}
            hidePrintButton
            hidePointsPanel
            printCreditFields
            cisId={cisId}
            status={status as any}
            customerType={customerType}
            onStatusesChange={setDocReviewStatuses}
            onMetricSave={canAct ? handleMetricSave : undefined}
            reviewRejectionTimestamp={latestReturnedAt}
            {...(cisData as any)}
            metricPoints={metricPoints as any}
          />
        </div>

        <div className="print:hidden space-y-5 xl:col-span-2 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
          <WorkflowStepper status={status as any} customerType={customerType} events={events as any} cisCreatedAt={cisData.createdAt as any} />
          <WorkflowHandoff status={status as any} customerType={customerType} agentType={cisData.agentType as string | null} />
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
            docCertifications={cisData.docCertifications}
            docGovCertifications={cisData.docGovCertifications}
            docOther={cisData.docOther}
            metricPoints={metricPoints as any}
            financePossiblePoints={cisData.financePossiblePoints as number | null}
            financeApprovedPoints={cisData.financeApprovedPoints as number | null}
            docReviewStatuses={docReviewStatuses}
            agentType={cisData.agentType as string | null}
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
          initialCreditTerms={(cisData.financeCreditTerms as string | null) ?? ""}
          initialCreditLimit={(cisData.financeCreditLimit as string | null) ?? ""}
          forwardEndpoint={forwardEndpoint}
          denyEndpoint={denyEndpoint}
          dashboardPath="/legal"
          printEnabled={printEnabled}
          docReviewStatuses={docReviewStatuses}
          hasUnresolvedRejections={hasUnresolvedRejections}
          hasUnreviewedDocs={hasPendingDocReviews}
        />
      )}
    </>
  );
}
