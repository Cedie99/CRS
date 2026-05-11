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

// Which workflow actions signal ENTRY into each step (by step key)
const STEP_ENTRY_ACTIONS: Record<string, string[]> = {
  submitted:              ["submitted", "agent_submitted"],
  pending_review:         ["submitted", "agent_submitted"],
  pending_legal_review:   ["forwarded_to_legal"],
  pending_finance_review: ["endorsed", "forwarded_to_finance"],
  pending_approval:       ["forwarded_to_approver"],
  approved:               ["approved"],
  pending_erp_encoding:   ["sales_support_submitted"],
  erp_encoded:            ["erp_encoded"],
};

// ── Duration helpers ───────────────────────────────────────────────────────────

function toMs(d: Date | string): number {
  return typeof d === "string" ? new Date(d).getTime() : d.getTime();
}

function formatDuration(ms: number): string {
  const totalMins = Math.floor(ms / 60_000);
  if (totalMins < 1) return "<1m";
  if (totalMins < 60) return `${totalMins}m`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs < 24) return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`;
}

interface StepTiming {
  enteredAt: number | null;
  exitedAt: number | null;
}

function computeStepTimings(
  steps: Step[],
  events: Array<{ action: string; createdAt: Date | string }>,
  cisCreatedAt: Date | string | null | undefined,
  now: number,
): StepTiming[] {
  // Build a flat list of (timestamp, action) sorted ascending
  const sorted = [...events].sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));

  // For each step, find the earliest event whose action is in its entry set
  const enteredAt: (number | null)[] = steps.map((step) => {
    const entryActions = STEP_ENTRY_ACTIONS[step.key] ?? [];
    if (step.key === "submitted" && cisCreatedAt) {
      // First step: use form creation time
      return toMs(cisCreatedAt);
    }
    const ev = sorted.find((e) => entryActions.includes(e.action));
    return ev ? toMs(ev.createdAt) : null;
  });

  // Each step exits when the next step enters
  return steps.map((_, i) => ({
    enteredAt: enteredAt[i],
    exitedAt: enteredAt[i + 1] ?? null,
  }));
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface WorkflowStepperProps {
  status: CisStatus;
  customerType?: string | null;
  events?: Array<{ action: string; createdAt: Date | string }> | null;
  cisCreatedAt?: Date | string | null;
}

export function WorkflowStepper({ status, customerType, events, cisCreatedAt }: WorkflowStepperProps) {
  const isLegal = customerType === "dealer";
  const isUnknown = status === "submitted";
  const steps = isUnknown ? PENDING_STEPS : isLegal ? LEGAL_STEPS : STANDARD_STEPS;
  const indexMap = isLegal ? LEGAL_STATUS_INDEX : STANDARD_STATUS_INDEX;

  const isTerminal = status === "denied" || status === "returned";
  const isDone = status === "erp_encoded";
  const currentIndex = indexMap[status] ?? -1;
  const currentStepLabel = currentIndex >= 0 ? steps[currentIndex]?.label : "Pending";

  const now = Date.now();
  const timings = (events && events.length > 0)
    ? computeStepTimings(steps, events, cisCreatedAt, now)
    : steps.map(() => ({ enteredAt: null, exitedAt: null }));

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
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 rounded-2xl border border-zinc-200/80 bg-linear-to-br from-white via-zinc-50 to-white p-5 shadow-md md:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400">
            Workflow Progress
          </p>
          <h3 className="mt-1.5 text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
            {isDone ? "Workflow completed" : "Form is moving forward"}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 md:text-base">
            {isDone
              ? "All business steps are complete."
              : `Currently in ${currentStepLabel} stage.`}
          </p>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-bold shadow-sm",
            isDone
              ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
          )}
        >
          {progressPercent}%
        </span>
      </div>

      {/* Colour bar */}
      <div className="mb-4 flex gap-1.5 rounded-lg bg-white px-1.5 py-1.5 shadow-inner">
        {Array.from({ length: totalSegments }).map((_, i) => {
          const isFilled = i < filledSegments;
          const hue = Math.round((120 * i) / Math.max(totalSegments - 1, 1));
          return (
            <span
              key={i}
              className={cn(
                "h-3 flex-1 rounded-full transition-all duration-500",
                isFilled ? "opacity-100 shadow-sm" : "bg-zinc-200/60 opacity-50"
              )}
              style={isFilled ? { backgroundColor: `hsl(${hue} 85% 50%)` } : undefined}
            />
          );
        })}
      </div>

      {/* Step nodes — no overflow-x-auto, fits in container */}
      <div className="rounded-xl bg-white/80 px-2 py-3 shadow-sm">
        <div className="relative mt-2 pb-3">
          {/* Connecting track */}
          <div className="absolute left-[8.33%] right-[8.33%] top-3 h-1 rounded-full bg-zinc-200" />
          <div
            className="absolute left-[8.33%] top-3 h-1 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 transition-all duration-700 ease-out shadow-sm"
            style={{ width: `calc(${horizontalFillPct}% * (100% - 16.66%) / 100)` }}
          />

          <div className="relative grid grid-cols-6 gap-0">
            {steps.map((step, i) => {
              const isCompleted = i < currentIndex;
              const isCurrent = i === currentIndex;
              const isFuture = i > currentIndex;
              const isDoneStep = step.key === "erp_encoded" && isDone && isCurrent;

              // Time label
              const { enteredAt, exitedAt } = timings[i];
              let timeLabel: string | null = null;
              if (enteredAt !== null) {
                const endMs = isCompleted ? (exitedAt ?? now) : isCurrent ? now : null;
                if (endMs !== null) {
                  const ms = endMs - enteredAt;
                  const formatted = formatDuration(ms);
                  timeLabel = isCurrent ? formatted : formatted;
                }
              }

              return (
                <div
                  key={step.key}
                  className="animate-in fade-in-0 flex flex-col items-center duration-500"
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  {/* Node */}
                  <div className="relative flex h-7 w-7 items-center justify-center">
                    {isCurrent && !isDoneStep && (
                      <>
                        <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                        <span className="absolute inset-0 rounded-full border-2 border-blue-400/50 animate-pulse" />
                      </>
                    )}
                    {isDoneStep && (
                      <>
                        <span className="absolute -inset-1.5 rounded-full bg-yellow-400/30 animate-[glow-pulse_2s_ease-in-out_infinite]" />
                        <span className="absolute -inset-1 rounded-full border-2 border-yellow-400/60" />
                      </>
                    )}
                    <div
                      className={cn(
                        "relative z-10 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-500 overflow-hidden",
                        isCompleted && !isDoneStep && "bg-emerald-500 text-white shadow-md shadow-emerald-200",
                        isCurrent && !isDoneStep && "bg-blue-500 text-white ring-3 ring-blue-200 shadow-lg shadow-blue-200",
                        isFuture && "bg-zinc-200 text-zinc-400",
                        isDoneStep && "bg-linear-to-br from-yellow-400 to-amber-500 text-white ring-3 ring-yellow-200 shadow-lg shadow-yellow-200"
                      )}
                    >
                      {isDoneStep && (
                        <span
                          className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent"
                          style={{ animation: "shine 2s linear infinite" }}
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

                  {/* Label */}
                  <p
                    className={cn(
                      "mt-2 text-center text-[11px] font-bold leading-tight",
                      isCompleted || isCurrent ? "text-zinc-900" : "text-zinc-400",
                      isDoneStep && "text-amber-800"
                    )}
                  >
                    {step.label}
                  </p>

                  {/* Status sub-label */}
                  <p
                    className={cn(
                      "mt-1 text-[10px] font-semibold",
                      isCompleted && !isDoneStep && "text-emerald-600",
                      isCurrent && !isDoneStep && "text-blue-600",
                      isFuture && "text-zinc-400",
                      isDoneStep && "text-amber-600"
                    )}
                  >
                    {isDoneStep ? "Done!" : isCompleted ? "Done" : isCurrent ? "Current" : "—"}
                  </p>

                  {/* Time-on-stage */}
                  {timeLabel && !isDoneStep && (
                    <p
                      className={cn(
                        "mt-1 text-[10px] tabular-nums leading-tight text-center font-medium",
                        isCurrent ? "text-blue-600" : "text-zinc-400"
                      )}
                    >
                      {isCurrent ? `${timeLabel} here` : timeLabel}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
        Workflow path is determined by customer type and current approval status.
      </div>
    </div>
  );
}
