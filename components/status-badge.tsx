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
  | "erp_encoded"
  | "denied"
  | "returned";

const STATUS_CONFIG: Record<CisStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
  },
  submitted: {
    label: "Submitted",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
  pending_endorsement: {
    label: "Pending Endorsement",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
  pending_legal_review: {
    label: "Pending Legal Review",
    className: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  },
  pending_finance_review: {
    label: "Pending Finance Review",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
  pending_approval: {
    label: "Pending Approval",
    className: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
  erp_encoded: {
    label: "ERP Encoded",
    className: "bg-green-200 text-green-800 hover:bg-green-200",
  },
  denied: {
    label: "Denied",
    className: "bg-red-100 text-red-700 hover:bg-red-100",
  },
  returned: {
    label: "Returned",
    className: "bg-rose-100 text-rose-700 hover:bg-rose-100",
  },
};

interface StatusBadgeProps {
  status: CisStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge className={cn("font-medium border-0", config.className, className)}>
      {config.label}
    </Badge>
  );
}
