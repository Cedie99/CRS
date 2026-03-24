import { Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CisStatus } from "@/components/status-badge";

interface Step {
  key: string;
  label: string;
}

const STANDARD_STEPS: Step[] = [
  { key: "submitted", label: "Submitted" },
  { key: "pending_endorsement", label: "Endorsement" },
  { key: "pending_finance_review", label: "Finance Review" },
  { key: "pending_approval", label: "Approval" },
  { key: "approved", label: "Approved" },
];

const LEGAL_STEPS: Step[] = [
  { key: "submitted", label: "Submitted" },
  { key: "pending_legal_review", label: "Legal Review" },
  { key: "pending_finance_review", label: "Finance Review" },
  { key: "pending_approval", label: "Approval" },
  { key: "approved", label: "Approved" },
];

// Map each status to its step index (0-based)
const STANDARD_STATUS_INDEX: Partial<Record<CisStatus, number>> = {
  submitted: 0,
  pending_endorsement: 1,
  pending_finance_review: 2,
  pending_approval: 3,
  approved: 4,
  erp_encoded: 4,
};

const LEGAL_STATUS_INDEX: Partial<Record<CisStatus, number>> = {
  submitted: 0,
  pending_legal_review: 1,
  pending_finance_review: 2,
  pending_approval: 3,
  approved: 4,
  erp_encoded: 4,
};

interface WorkflowStepperProps {
  status: CisStatus;
  customerType: string;
}

export function WorkflowStepper({ status, customerType }: WorkflowStepperProps) {
  const isLegal = customerType === "fs_petroleum" || customerType === "special";
  const steps = isLegal ? LEGAL_STEPS : STANDARD_STEPS;
  const indexMap = isLegal ? LEGAL_STATUS_INDEX : STANDARD_STATUS_INDEX;

  const isTerminal = status === "denied" || status === "returned";
  const currentIndex = indexMap[status] ?? -1;

  if (isTerminal) {
    return (
      <div className="rounded-xl border bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          {status === "denied" ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
              <X className="h-3.5 w-3.5 text-red-600" />
            </span>
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100">
              <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
            </span>
          )}
          <span className={cn(
            "text-sm font-medium",
            status === "denied" ? "text-red-700" : "text-rose-700"
          )}>
            {status === "denied" ? "Submission Denied" : "Returned to Agent"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white px-4 py-3">
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isCompleted && "bg-[#2d6e1e] text-white",
                    isCurrent && "bg-[#2d6e1e] text-white ring-2 ring-[#2d6e1e] ring-offset-2",
                    isFuture && "bg-zinc-100 text-zinc-400"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "hidden whitespace-nowrap text-[10px] font-medium sm:block",
                    isCompleted && "text-[#2d6e1e]",
                    isCurrent && "text-[#2d6e1e]",
                    isFuture && "text-zinc-400"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-1 mb-4 h-px flex-1 sm:mx-2",
                    i < currentIndex ? "bg-[#2d6e1e]" : "bg-zinc-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
