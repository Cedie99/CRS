import { Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CisStatus } from "@/components/status-badge";

interface Step {
  key: string;
  label: string;
}

// Standard path: Finance → Approval → Sales Support → Project Dev
const STANDARD_STEPS: Step[] = [
  { key: "submitted",               label: "Agent" },
  { key: "pending_finance_review",  label: "Finance" },
  { key: "pending_approval",        label: "Approval" },
  { key: "approved",                label: "Support" },
  { key: "pending_erp_encoding",    label: "ERP" },
  { key: "erp_encoded",             label: "Done" },
];

// Dealer path: Legal → Approval → Sales Support → Project Dev
const LEGAL_STEPS: Step[] = [
  { key: "submitted",              label: "Agent"    },
  { key: "pending_legal_review",   label: "Legal"    },
  { key: "pending_approval",       label: "Approval" },
  { key: "approved",               label: "Support"  },
  { key: "pending_erp_encoding",   label: "ERP"      },
  { key: "erp_encoded",            label: "Done"     },
];

// Unknown-type path (agent hasn't selected customer type yet)
const PENDING_STEPS: Step[] = [
  { key: "submitted",              label: "Agent"    },
  { key: "pending_review",         label: "Review"   },
  { key: "pending_approval",       label: "Approval" },
  { key: "approved",               label: "Support"  },
  { key: "pending_erp_encoding",   label: "ERP"      },
  { key: "erp_encoded",            label: "Done"     },
];

const STANDARD_STATUS_INDEX: Partial<Record<CisStatus, number>> = {
  submitted:                0,
  pending_finance_review:   1,
  pending_approval:         2,
  approved:                 3,
  pending_erp_encoding:     4,
  erp_encoded:              5,
};

const LEGAL_STATUS_INDEX: Partial<Record<CisStatus, number>> = {
  submitted:              0,
  pending_legal_review:   1,
  pending_approval:       2,
  approved:               3,
  pending_erp_encoding:   4,
  erp_encoded:            5,
};

interface WorkflowStepperProps {
  status: CisStatus;
  customerType?: string | null;
}

export function WorkflowStepper({ status, customerType }: WorkflowStepperProps) {
  const isLegal = customerType === "dealer";
  const isUnknown = status === "submitted";
  const steps = isUnknown ? PENDING_STEPS : isLegal ? LEGAL_STEPS : STANDARD_STEPS;
  const indexMap = isLegal ? LEGAL_STATUS_INDEX : STANDARD_STATUS_INDEX;

  const isTerminal = status === "denied" || status === "returned";
  const currentIndex = indexMap[status] ?? -1;

  if (isTerminal) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-linear-to-br from-white to-zinc-50 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          {status === "denied" ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-100">
              <X className="h-4 w-4 text-red-600" />
            </span>
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-100">
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

  const progressPercent = Math.round(((Math.max(currentIndex, 0) + 1) / steps.length) * 100);

  return (
    <div className="animate-in slide-in-from-bottom-1 fade-in-0 rounded-xl border border-zinc-200 bg-linear-to-br from-white via-white to-zinc-50 px-5 py-5 shadow-sm duration-500">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-widest text-zinc-500">
          Workflow Progress
        </p>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
          {progressPercent}%
        </span>
      </div>

      <div className="md:hidden">
        <div className="space-y-3">
          {steps.map((step, i) => {
            const isCompleted = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isFuture = i > currentIndex;
            const isLast = i === steps.length - 1;
            const isDone = isCurrent && isLast;

            return (
              <div
                key={step.key}
                className="animate-in slide-in-from-left-1 fade-in-0 relative flex items-center gap-3 duration-500"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                  {isCurrent && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-[#2d6e1e]/25 blur-[1px] animate-pulse" />
                      <span className="absolute inset-0 rounded-full border border-[#2d6e1e]/40 animate-ping" />
                    </>
                  )}
                  <div
                    className={cn(
                      "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-500",
                      (isCompleted || isCurrent || isDone) && "border-[#2d6e1e] bg-[#2d6e1e] text-white shadow-[0_6px_14px_-8px_rgba(45,110,30,0.8)]",
                      isFuture && "border-zinc-200 bg-zinc-100 text-zinc-400"
                    )}
                  >
                    {isCompleted || isDone ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
                  </div>
                </div>

                <span
                  className={cn(
                    "text-sm font-semibold",
                    (isDone || isCompleted || isCurrent) && "text-[#2d6e1e]",
                    isFuture && "text-zinc-400"
                  )}
                >
                  {step.label}
                </span>
                {isCurrent && (
                  <span className="relative inline-flex items-center">
                    <span className="absolute inset-0 rounded-full bg-emerald-100/70 blur-sm animate-pulse" />
                    <span className="relative inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      </span>
                      Current
                    </span>
                  </span>
                )}

                {!isLast && (
                  <span
                    className={cn(
                      "absolute left-3.75 top-8 h-4 w-0.5 rounded-full transition-colors duration-500",
                      i < currentIndex ? "bg-[#2d6e1e]" : "bg-zinc-200"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-6 items-start gap-2 pt-2">
          {steps.map((step, i) => {
            const isCompleted = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isFuture = i > currentIndex;
            const isLast = i === steps.length - 1;
            const isDone = isCurrent && isLast;

            return (
              <div
                key={step.key}
                className="animate-in slide-in-from-bottom-1 fade-in-0 relative flex flex-col items-center duration-500"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {!isLast && (
                  <span
                    className={cn(
                      "absolute left-1/2 top-5 h-0.5 w-full transition-colors duration-500",
                      i < currentIndex ? "bg-linear-to-r from-[#2d6e1e] to-[#54a844]" : "bg-zinc-200"
                    )}
                  />
                )}

                <div className="relative z-10 flex h-10 w-10 items-center justify-center">
                  {isCurrent && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-[#2d6e1e]/25 blur-[1px] animate-pulse" />
                      <span className="absolute inset-0 rounded-full border border-[#2d6e1e]/40 animate-ping" />
                    </>
                  )}
                  <div
                    className={cn(
                      "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-500",
                      (isCompleted || isCurrent || isDone) && "border-[#2d6e1e] bg-[#2d6e1e] text-white shadow-[0_8px_18px_-10px_rgba(45,110,30,0.8)]",
                      isFuture && "border-zinc-200 bg-zinc-100 text-zinc-400"
                    )}
                  >
                    {isCompleted || isDone ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
                  </div>
                </div>

                <span
                  className={cn(
                    "mt-2 text-center text-[12px] font-semibold",
                    (isDone || isCompleted || isCurrent) && "text-[#2d6e1e]",
                    isFuture && "text-zinc-400"
                  )}
                >
                  {step.label}
                </span>
                {isCurrent && (
                  <span className="relative mt-1 inline-flex items-center">
                    <span className="absolute inset-0 rounded-full bg-emerald-100/70 blur-sm animate-pulse" />
                    <span className="relative inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      </span>
                      Current
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
