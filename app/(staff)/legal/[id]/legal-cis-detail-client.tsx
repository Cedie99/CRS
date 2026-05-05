"use client";

import { useState } from "react";
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

  // Recompute printEnabled from live docReviewStatuses so it updates without a page refresh.
  // Only gated on document reviews — credit limit/terms are filled physically by CFO.
  const hasPendingDocReviews = SCORING_DOC_KEYS.some((field) => {
    const val = cisData[field];
    const uploaded = Array.isArray(val) && val.length > 0;
    return uploaded && !REVIEWED_STATUSES.has(docReviewStatuses[field]?.status as string);
  });
  const printEnabled = !hasPendingDocReviews;

  return (
    <>
      {canAct && (
        <FinanceActions
          cisId={cisId}
          initialSirRestyFiles={initialSirRestyFiles as any}
          forwardEndpoint={forwardEndpoint}
          denyEndpoint={denyEndpoint}
          dashboardPath="/legal"
          printEnabled={printEnabled}
        />
      )}

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3 print:col-span-full">
          <DocReviewPanel
            initialDocReviewStatuses={initialDocReviewStatuses}
            canAct={canAct}
            printEnabled={printEnabled}
            hidePrintButton
            hidePointsPanel
            cisId={cisId}
            status={status as any}
            customerType={customerType}
            onStatusesChange={setDocReviewStatuses}
            {...(cisData as any)}
          />
        </div>

        <div className="print:hidden space-y-5 xl:col-span-2 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
          <WorkflowStepper status={status as any} customerType={customerType} />
          <WorkflowHandoff status={status as any} customerType={customerType} />
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
            docIsoCertification={cisData.docIsoCertification}
            docHalalCertificate={cisData.docHalalCertificate}
            docCertifications={cisData.docCertifications}
            docGovCertifications={cisData.docGovCertifications}
            docOther={cisData.docOther}
            financePossiblePoints={cisData.financePossiblePoints as number | null}
            financeApprovedPoints={cisData.financeApprovedPoints as number | null}
            docReviewStatuses={docReviewStatuses}
            agentType={cisData.agentType as string | null}
            customerType={customerType}
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
    </>
  );
}
