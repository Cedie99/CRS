import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type CisStatus =
  | "draft"
  | "submitted"
  | "pending_endorsement"
  | "pending_legal_review"
  | "pending_finance_review"
  | "pending_approval"
  | "approved"
  | "pending_erp_encoding"
  | "erp_encoded"
  | "denied"
  | "returned";

const STATUS_CONFIG: Record<
  CisStatus,
  { label: string; mobileLabel?: string; className: string; dot: string; pulse?: boolean }
> = {
  draft: {
    label: "Draft",
    className: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
    dot: "bg-zinc-400",
  },
  submitted: {
    label: "Submitted",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    dot: "bg-blue-400",
    pulse: true,
  },
  pending_endorsement: {
    label: "Manager Review",
    mobileLabel: "Manager",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    dot: "bg-amber-400",
    pulse: true,
  },
  pending_legal_review: {
    label: "Legal Review",
    mobileLabel: "Legal",
    className: "bg-purple-100 text-purple-700 hover:bg-purple-100",
    dot: "bg-purple-400",
    pulse: true,
  },
  pending_finance_review: {
    label: "Finance Review",
    mobileLabel: "Finance",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    dot: "bg-amber-500",
    pulse: true,
  },
  pending_approval: {
    label: "Final Approval",
    mobileLabel: "Approval",
    className: "bg-orange-100 text-orange-700 hover:bg-orange-100",
    dot: "bg-orange-400",
    pulse: true,
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-700 hover:bg-green-100",
    dot: "bg-green-500",
  },
  pending_erp_encoding: {
    label: "ERP Encoding",
    mobileLabel: "Encoding",
    className: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
    dot: "bg-indigo-500",
    pulse: true,
  },
  erp_encoded: {
    label: "Onboarded",
    className: "bg-green-200 text-green-800 hover:bg-green-200",
    dot: "bg-green-600",
  },
  denied: {
    label: "Denied",
    className: "bg-red-100 text-red-700 hover:bg-red-100",
    dot: "bg-red-500",
  },
  returned: {
    label: "Returned",
    className: "bg-rose-100 text-rose-700 hover:bg-rose-100",
    dot: "bg-rose-500",
  },
};

const FALLBACK_STATUS_CONFIG = {
  label: "Unknown",
  className: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
  dot: "bg-zinc-400",
} as const;

function isCisStatus(value: string): value is CisStatus {
  return Object.prototype.hasOwnProperty.call(STATUS_CONFIG, value);
}

interface StatusBadgeProps {
  status: CisStatus | string | null | undefined;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = typeof status === "string" && isCisStatus(status)
    ? STATUS_CONFIG[status]
    : FALLBACK_STATUS_CONFIG;
  return (
    <Badge className={cn("max-w-[46vw] min-w-0 border-0 font-medium gap-1.5 sm:max-w-none", config.className, className)}>
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
          config.dot,
          config.pulse && "animate-pulse"
        )}
      />
      <span className="truncate sm:hidden">{config.mobileLabel ?? config.label}</span>
      <span className="hidden sm:inline">{config.label}</span>
    </Badge>
  );
}
