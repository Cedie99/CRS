import Link from "next/link";
import { StatusBadge, type CisStatus } from "@/components/status-badge";
import { formatDistanceToNow, humanizeDisplayValue, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, Building2, ChevronRight, RefreshCw } from "lucide-react";

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  dealer: "Dealer",
  distributor: "Distributor",
  private_label: "Private Label",
  toll_blend: "Toll Blend",
  end_user: "End-User",
};

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  dealer: "bg-blue-50 text-blue-700",
  distributor: "bg-teal-50 text-teal-700",
  private_label: "bg-violet-50 text-violet-700",
  toll_blend: "bg-orange-50 text-orange-700",
  end_user: "bg-green-50 text-green-700",
};


const NEXT_STEP: Partial<Record<CisStatus, string>> = {
  draft: "Waiting for customer to fill the form",
  submitted: "Customer submitted — agent fill-out required",
  pending_endorsement: "Waiting for manager to review",
  pending_legal_review: "Under legal review",
  pending_finance_review: "Under finance review",
  pending_approval: "Awaiting final approval",
  approved: "Approved — Sales Support fill-out required",
  pending_erp_encoding: "Awaiting ERP encoding",
  erp_encoded: "Customer successfully onboarded",
  denied: "This form was not approved",
  returned: "Sent back — please create a new form",
};

function getWorkflowStep(status: CisStatus, customerType?: string | null): number {
  const isLegal = customerType === "dealer";
  if (status === "denied" || status === "returned") return -1;

  const standardMap: Partial<Record<CisStatus, number>> = {
    draft: 0, submitted: 0,
    pending_endorsement: 1,
    pending_finance_review: 1,
    pending_approval: 2,
    approved: 3,
    pending_erp_encoding: 4,
    erp_encoded: 5,
  };

  const legalMap: Partial<Record<CisStatus, number>> = {
    draft: 0, submitted: 0,
    pending_legal_review: 1,
    pending_approval: 2,
    approved: 3,
    pending_erp_encoding: 4,
    erp_encoded: 5,
  };

  return (isLegal ? legalMap : standardMap)[status] ?? 0;
}

interface CisCardProps {
  id: string;
  tradeName: string | null;
  contactPerson: string | null;
  customerType?: string | null;
  agentCode: string;
  agentName?: string;
  status: CisStatus;
  createdAt: Date;
  updatedAt?: Date;
  href: string;
  mobileCta?: string;
}

export function CisCard({
  id,
  tradeName,
  contactPerson,
  customerType,
  agentCode,
  agentName,
  status,
  createdAt,
  updatedAt,
  href,
  mobileCta,
}: CisCardProps) {
  const currentStep = getWorkflowStep(status, customerType);
  const totalSteps = 7;
  const isTerminal = status === "denied" || status === "returned";
  const isComplete = status === "erp_encoded";
  const shortId = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const hasFinalizedCustomerType =
    status !== "draft" && status !== "submitted" && Boolean(customerType);

  const wasUpdated =
    updatedAt &&
    new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 60_000;

  const now = Date.now();
  const lastActivityAt = wasUpdated && updatedAt ? new Date(updatedAt) : new Date(createdAt);
  const hoursSinceActivity = (now - lastActivityAt.getTime()) / 3_600_000;
  const isLatest = hoursSinceActivity <= 24;
  const isFresh = !isLatest && hoursSinceActivity <= 72;

  const progressValue = isTerminal
    ? 100
    : Math.max(14, Math.round(((isComplete ? totalSteps : Math.max(1, currentStep + 1)) / totalSteps) * 100));

  const assignedAgent = agentName ? `${agentName} (${agentCode})` : agentCode;

  return (
    <Link href={href} className="group block focus-visible:outline-none">
      <Card
        className={cn(
          "relative overflow-hidden border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
          "cursor-pointer transition-all duration-200",
          "group-hover:-translate-y-0.5 group-hover:shadow-md",
          "group-focus-visible:ring-2 group-focus-visible:ring-[#2d6e1e]/30"
        )}
      >
        <CardHeader className="space-y-2.5 pb-2 pt-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-semibold tracking-wide text-zinc-400">#{shortId}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                <span className="font-semibold text-zinc-600">Agent Code:</span> {assignedAgent}
              </p>
            </div>
            <StatusBadge status={status} className="shrink-0" />
          </div>

          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 text-[18px] font-semibold leading-snug tracking-tight text-zinc-900 transition-colors group-hover:text-[#2d6e1e]">
              {tradeName ?? <span className="font-normal italic text-zinc-400">Untitled</span>}
            </p>
            <ChevronRight
              className={cn(
                "mt-1 h-4 w-4 shrink-0 transition-all duration-200",
                "translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                isTerminal ? "text-zinc-400" : "text-[#2d6e1e]"
              )}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-3.5 pt-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm text-zinc-600">
              <span className="font-semibold text-zinc-700">Customer:</span> {contactPerson ?? "-"}
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                hasFinalizedCustomerType && customerType
                  ? (CUSTOMER_TYPE_COLORS[customerType] ?? "bg-zinc-100 text-zinc-600")
                  : "bg-zinc-100 text-zinc-400"
              )}
            >
              <Building2 className="h-3 w-3" />
              {hasFinalizedCustomerType && customerType
                ? (CUSTOMER_TYPE_LABELS[customerType] ?? humanizeDisplayValue(customerType))
                : "Pending"}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
              <span>Step {isComplete ? totalSteps : Math.max(1, currentStep + 1)}/{totalSteps}</span>
              <span>{progressValue}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-[#2d6e1e] transition-all duration-500" style={{ width: `${progressValue}%` }} />
            </div>
            <p className={cn("text-[12px]", isTerminal ? "text-red-500" : "text-zinc-700")}>{NEXT_STEP[status]}</p>
          </div>

          <div className="flex items-center justify-end">
            {isLatest && (
              <span className="mr-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                Latest
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]",
                isLatest && "bg-green-50 text-green-700",
                !isLatest && isFresh && "bg-amber-50 text-amber-700",
                !isLatest && !isFresh && "text-zinc-400"
              )}
            >
              {wasUpdated ? (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Updated {formatDistanceToNow(updatedAt!)} ago
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  Submitted {formatDistanceToNow(createdAt)} ago
                </>
              )}
            </span>
          </div>

          {mobileCta && (
            <div className="mt-3 -mx-3.5 border-t border-[#2d6e1e]/15 sm:hidden">
              <div className="flex items-center justify-between bg-[#2d6e1e]/6 px-4 py-2.5">
                <span className="text-xs font-semibold text-[#2d6e1e]">{mobileCta}</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#2d6e1e]" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
