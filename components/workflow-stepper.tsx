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
  const isLegal = (customerType ?? "") === "dealer";
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
    <div className="animate-in slide-in-from-bottom-1 fade-in-0 rounded-xl border bg-white px-5 py-5 duration-500">
      <p className="mb-4 text-[12px] font-semibold uppercase tracking-widest text-zinc-400">
        Workflow Progress
      </p>
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
                  {isCurrent && <span className="absolute inset-0 rounded-full bg-[#2d6e1e]/20 animate-pulse" />}
                  <div
                    className={cn(
                      "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-500",
                      (isCompleted || isCurrent || isDone) && "bg-[#2d6e1e] text-white",
                      isFuture && "bg-zinc-100 text-zinc-400"
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
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                    Current
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
                      i < currentIndex ? "bg-[#2d6e1e]" : "bg-zinc-200"
                    )}
                  />
                )}

                <div className="relative z-10 flex h-10 w-10 items-center justify-center">
                  {isCurrent && <span className="absolute inset-0 rounded-full bg-[#2d6e1e]/20 animate-pulse" />}
                  <div
                    className={cn(
                      "relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition-all duration-500",
                      (isCompleted || isCurrent || isDone) && "bg-[#2d6e1e] text-white shadow-sm",
                      isFuture && "bg-zinc-100 text-zinc-400"
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
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                    Current
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
