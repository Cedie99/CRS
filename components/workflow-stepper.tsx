import { Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CisStatus } from "@/components/status-badge";

interface Step {
  key: string;
  label: string;
}

const STANDARD_STEPS: Step[] = [
  { key: "submitted", label: "Submitted" },
  { key: "pending_endorsement", label: "Manager" },
  { key: "pending_finance_review", label: "Finance" },
  { key: "pending_approval", label: "Approval" },
  { key: "approved", label: "Done" },
];

const LEGAL_STEPS: Step[] = [
  { key: "submitted", label: "Submitted" },
  { key: "pending_legal_review", label: "Legal" },
  { key: "pending_finance_review", label: "Finance" },
  { key: "pending_approval", label: "Approval" },
  { key: "approved", label: "Done" },
];

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
      <div className="rounded-xl border bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          {status === "denied" ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
              <X className="h-4 w-4 text-red-600" />
            </span>
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100">
              <RotateCcw className="h-4 w-4 text-rose-600" />
            </span>
          )}
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                status === "denied" ? "text-red-700" : "text-rose-700"
              )}
            >
              {status === "denied" ? "Submission Denied" : "Returned to Agent"}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">This form is no longer being processed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white px-5 py-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
        Workflow Progress
      </p>
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                    isCompleted && "bg-[#2d6e1e] text-white shadow-sm",
                    isCurrent &&
                      "bg-[#2d6e1e] text-white ring-4 ring-[#2d6e1e]/20",
                    isFuture && "bg-zinc-100 text-zinc-400"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "hidden whitespace-nowrap text-[10px] font-semibold sm:block",
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
                    "mx-1 mb-5 h-0.5 flex-1 rounded-full sm:mx-2",
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
