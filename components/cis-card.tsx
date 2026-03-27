import Link from "next/link";
import { StatusBadge, type CisStatus } from "@/components/status-badge";
import { formatDistanceToNow } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { User, Clock, Building2, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  fs_petroleum: "FS Petroleum",
  special: "Special",
};

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  standard: "bg-zinc-100 text-zinc-600",
  fs_petroleum: "bg-purple-50 text-purple-700",
  special: "bg-amber-50 text-amber-700",
};


const NEXT_STEP: Partial<Record<CisStatus, string>> = {
  draft: "Waiting for customer to fill the form",
  submitted: "Under review — will be assigned shortly",
  pending_endorsement: "Waiting for manager to review",
  pending_legal_review: "Under legal review",
  pending_finance_review: "Under finance review",
  pending_approval: "Awaiting final approval",
  approved: "Almost done — being entered into the system",
  erp_encoded: "Customer successfully onboarded",
  denied: "This form was not approved",
  returned: "Sent back — please create a new form",
};

function getWorkflowStep(status: CisStatus, customerType: string): number {
  const isLegal = customerType === "fs_petroleum" || customerType === "special";
  if (status === "denied" || status === "returned") return -1;

  const standardMap: Partial<Record<CisStatus, number>> = {
    draft: 0, submitted: 0,
    pending_endorsement: 1,
    pending_finance_review: 2,
    pending_approval: 3,
    approved: 4, erp_encoded: 4,
  };

  const legalMap: Partial<Record<CisStatus, number>> = {
    draft: 0, submitted: 0,
    pending_legal_review: 1,
    pending_finance_review: 2,
    pending_approval: 3,
    approved: 4, erp_encoded: 4,
  };

  return (isLegal ? legalMap : standardMap)[status] ?? 0;
}

interface CisCardProps {
  id: string;
  tradeName: string | null;
  contactPerson: string | null;
  customerType: string;
  agentCode: string;
  agentName?: string;
  status: CisStatus;
  createdAt: Date;
  updatedAt?: Date;
  href: string;
}

export function CisCard({
  id,
  tradeName,
  contactPerson,
  customerType,
  agentName,
  status,
  createdAt,
  updatedAt,
  href,
}: CisCardProps) {
  const currentStep = getWorkflowStep(status, customerType);
  const totalSteps = 5;
  const isTerminal = status === "denied" || status === "returned";
  const isComplete = status === "erp_encoded";
  const shortId = id.replace(/-/g, "").slice(0, 8).toUpperCase();

  const wasUpdated =
    updatedAt &&
    new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 60_000;

  return (
    <Link href={href} className="group block focus-visible:outline-none">
      <Card
        className={cn(
          "cursor-pointer transition-colors duration-150",
          "group-hover:bg-zinc-50",
          "group-focus-visible:ring-2 group-focus-visible:ring-[#2d6e1e]/30"
        )}
      >

        <CardHeader className="pb-2 pt-4">
          {/* Row 1: Short ID + agent info + Status Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-semibold tracking-wide text-zinc-400">
                #{shortId}
              </span>
              {agentName && (
                <>
                  <span className="text-zinc-200">·</span>
                  <span className="text-xs text-zinc-400">{agentName}</span>
                </>
              )}
            </div>
            <StatusBadge status={status} />
          </div>

          {/* Row 2: Trade name + hover chevron */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-snug text-zinc-900 transition-colors group-hover:text-[#2d6e1e]">
              {tradeName ?? (
                <span className="font-normal italic text-zinc-400">Untitled</span>
              )}
            </p>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-all duration-200",
                "translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                isTerminal ? "text-zinc-400" : "text-[#2d6e1e]"
              )}
            />
          </div>
        </CardHeader>

        <CardContent className="pb-4 pt-0">
          {/* Row 3: Contact person + Customer type pill */}
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1 text-sm text-zinc-500">
              <User className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span className="truncate">{contactPerson ?? "—"}</span>
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                CUSTOMER_TYPE_COLORS[customerType] ?? "bg-zinc-100 text-zinc-600"
              )}
            >
              <Building2 className="h-3 w-3" />
              {CUSTOMER_TYPE_LABELS[customerType] ?? customerType}
            </span>
          </div>

          {/* Divider */}
          <div className="my-3 h-px bg-zinc-100" />

          {/* Row 4: Workflow track + timestamp */}
          <div className="flex items-center justify-between gap-3">
            {isTerminal ? (
              <span
                className={cn(
                  "text-[11px] font-medium",
                  status === "denied" ? "text-red-500" : "text-rose-500"
                )}
              >
                {NEXT_STEP[status]}
              </span>
            ) : (
              <div className="flex items-center gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => {
                  const done = isComplete || i < currentStep;
                  const active = !isComplete && i === currentStep;
                  return (
                    <span key={i} className="flex items-center gap-1">
                      <span
                        className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full transition-all duration-300",
                          done && "bg-[#2d6e1e]",
                          active && "bg-[#2d6e1e] ring-2 ring-[#2d6e1e]/25",
                          !done && !active && "bg-zinc-200"
                        )}
                      />
                      {i < totalSteps - 1 && (
                        <span
                          className={cn(
                            "inline-block h-px w-2.5",
                            done ? "bg-[#2d6e1e]" : "bg-zinc-200"
                          )}
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Timestamp — shows "Updated" if record was modified after submission */}
            <span className="flex items-center gap-1 text-[11px] text-zinc-400">
              {wasUpdated ? (
                <>
                  <RefreshCw className="h-3 w-3" />
                  {formatDistanceToNow(updatedAt!)}
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(createdAt)}
                </>
              )}
            </span>
          </div>

          {/* Next step hint — only on non-terminal */}
          {!isTerminal && (
            <p className="mt-1.5 text-[11px] text-zinc-400">
              {NEXT_STEP[status]}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
