import { Check, CheckCircle2, Circle, RotateCcw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CisStatus } from "@/components/status-badge";

interface Step {
  key: string;
  label: string;
}

// Standard path: Finance → Approval → Sales Support → ERP
const STANDARD_STEPS: Step[] = [
  { key: "submitted",              label: "Agent"    },
  { key: "pending_finance_review", label: "Finance"  },
  { key: "pending_approval",       label: "Approval" },
  { key: "approved",               label: "Support"  },
  { key: "pending_erp_encoding",   label: "ERP"      },
  { key: "erp_encoded",            label: "Done"     },
];

// Dealer path: Legal → Approval → Sales Support → ERP
const LEGAL_STEPS: Step[] = [
  { key: "submitted",            label: "Agent"    },
  { key: "pending_legal_review", label: "Legal"    },
  { key: "pending_approval",     label: "Approval" },
  { key: "approved",             label: "Support"  },
  { key: "pending_erp_encoding", label: "ERP"      },
  { key: "erp_encoded",          label: "Done"     },
];

// Unknown-type path
const PENDING_STEPS: Step[] = [
  { key: "submitted",            label: "Agent"    },
  { key: "pending_review",       label: "Review"   },
  { key: "pending_approval",     label: "Approval" },
  { key: "approved",             label: "Support"  },
  { key: "pending_erp_encoding", label: "ERP"      },
  { key: "erp_encoded",          label: "Done"     },
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
  const isDone = status === "erp_encoded";
  const currentIndex = indexMap[status] ?? -1;
  const currentStepLabel = currentIndex >= 0 ? steps[currentIndex]?.label : "Pending";

  if (isTerminal) {
    return (
      <div
        className={cn(
          "flex items-center gap-3.5 rounded-xl border px-5 py-4",
          status === "denied"
            ? "border-red-200/80 bg-red-50/60"
            : "border-rose-200/80 bg-rose-50/60"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            status === "denied" ? "bg-red-100 text-red-600" : "bg-rose-100 text-rose-600"
          )}
        >
          {status === "denied" ? (
            <X className="h-4 w-4" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
        </span>
        <div>
          <p
            className={cn(
              "text-sm font-semibold",
              status === "denied" ? "text-red-700" : "text-rose-700"
            )}
          >
            {status === "denied" ? "Submission Denied" : "Returned to Agent"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            This form is no longer being processed.
          </p>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(
    ((Math.max(currentIndex, 0) + 1) / steps.length) * 100
  );

  const totalSegments = 34;
  const filledSegments = Math.max(
    1,
    Math.round((Math.max(currentIndex, 0) + 1) / steps.length * totalSegments)
  );
  const horizontalFillPct =
    currentIndex <= 0 ? 0 : (currentIndex / Math.max(steps.length - 1, 1)) * 100;

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 rounded-2xl border border-zinc-200 bg-linear-to-b from-zinc-50 to-white p-4 shadow-sm duration-500 md:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Workflow Progress
          </p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-zinc-900 md:text-xl">
            {isDone ? "Workflow completed" : "Form is moving forward"}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-600 md:text-sm">
            {isDone
              ? "All business steps are complete."
              : `Currently in ${currentStepLabel} stage.`}
          </p>
        </div>

        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            isDone
              ? "bg-emerald-100 text-emerald-700"
              : "bg-zinc-200/80 text-zinc-700"
          )}
        >
          {progressPercent}%
        </span>
      </div>

      <div className="mb-3.5 flex gap-1 rounded-md bg-white/70 px-1 py-1">
        {Array.from({ length: totalSegments }).map((_, i) => {
          const isFilled = i < filledSegments;
          const hue = Math.round((120 * i) / Math.max(totalSegments - 1, 1));

          return (
            <span
              key={i}
              className={cn(
                "h-4 flex-1 rounded-xs transition-all duration-500",
                isFilled ? "opacity-100" : "bg-zinc-200/80 opacity-70"
              )}
              style={
                isFilled
                  ? { backgroundColor: `hsl(${hue} 90% 55%)` }
                  : undefined
              }
            />
          );
        })}
      </div>

      <div className="rounded-xl bg-white/70 px-2.5 py-2.5">
        <div className="overflow-x-auto">
          <div className="min-w-140">
            <div className="relative mt-4 pb-9">
              <div className="absolute left-3 right-3 top-3.5 h-0.5 rounded-full bg-zinc-200" />
              <div
                className="absolute left-3 top-3.5 h-0.5 rounded-full bg-emerald-500/70 transition-all duration-500"
                style={{ width: `calc(${horizontalFillPct}% * (100% - 24px) / 100)` }}
              />

              <div className="relative grid grid-cols-6 gap-1">
                {steps.map((step, i) => {
                  const isCompleted = i < currentIndex;
                  const isCurrent = i === currentIndex;
                  const isFuture = i > currentIndex;
                  const isDoneStep = step.key === "erp_encoded" && isDone && isCurrent;

                  return (
                    <div
                      key={step.key}
                      className="animate-in fade-in-0 flex flex-col items-center duration-500"
                      style={{ animationDelay: `${i * 55}ms` }}
                    >
                      <div className="relative flex h-7 w-7 items-center justify-center">
                        {isCurrent && !isDoneStep && (
                          <>
                            <span className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping" />
                            <span className="absolute inset-1 rounded-full border border-emerald-600/40 animate-pulse" />
                          </>
                        )}
                        {isDoneStep && (
                          <>
                            <span className="absolute -inset-1 rounded-full bg-yellow-400/30 animate-[glow-pulse_2s_ease-in-out_infinite]" />
                            <span className="absolute -inset-0.5 rounded-full border-2 border-yellow-400/60" />
                          </>
                        )}
                        <div
                          className={cn(
                            "relative z-10 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-500 overflow-hidden",
                            isCompleted && !isDoneStep && "bg-emerald-600 text-white",
                            isCurrent && !isDoneStep && "bg-emerald-600 text-white ring-2 ring-emerald-200",
                            isFuture && "bg-zinc-200 text-zinc-400",
                            isDoneStep && "bg-linear-to-br from-yellow-400 to-amber-500 text-white ring-2 ring-yellow-200 shadow-lg"
                          )}
                        >
                          {isDoneStep && (
                            <span
                              className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent"
                              style={{
                                animation: "shine 2s linear infinite",
                              }}
                            />
                          )}
                          {isCompleted ? (
                            isDoneStep ? (
                              <Sparkles className="h-3.5 w-3.5 relative z-10" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          ) : isCurrent ? (
                            isDoneStep ? (
                              <CheckCircle2 className="h-4 w-4 relative z-10" />
                            ) : (
                              <Circle className="h-2.5 w-2.5 fill-current" />
                            )
                          ) : (
                            <Circle className="h-2.5 w-2.5" />
                          )}
                        </div>
                      </div>

                      <p
                        className={cn(
                          "mt-2 text-center text-xs font-semibold leading-tight",
                          isCompleted || isCurrent ? "text-zinc-900" : "text-zinc-500",
                          isDoneStep && "text-amber-700"
                        )}
                      >
                        {step.label}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-[10px] font-medium",
                          isCompleted && !isDoneStep && "text-emerald-700",
                          isCurrent && !isDoneStep && "text-emerald-700",
                          isFuture && "text-zinc-400",
                          isDoneStep && "text-amber-600 font-bold"
                        )}
                      >
                        {isDoneStep ? "Complete!" : isCompleted ? "Done" : isCurrent ? "Current" : "Next"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 text-[11px] text-zinc-500">
        Workflow path is determined by customer type and current approval status.
      </div>
    </div>
  );
}
