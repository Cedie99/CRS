import Image from "next/image";
import { formatDistanceToNow } from "@/lib/utils";
import {
  Send,
  CheckCheck,
  RotateCcw,
  Scale,
  DollarSign,
  BadgeCheck,
  XCircle,
  Database,
  FileText,
} from "lucide-react";

export type WorkflowAction =
  | "submitted"
  | "endorsed"
  | "returned"
  | "forwarded_to_legal"
  | "forwarded_to_finance"
  | "forwarded_to_approver"
  | "approved"
  | "denied"
  | "erp_encoded";

const ACTION_CONFIG: Record<
  WorkflowAction,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
    iconColor: string;
  }
> = {
  submitted: {
    label: "Submitted",
    icon: FileText,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  endorsed: {
    label: "Approved by Manager",
    icon: CheckCheck,
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  returned: {
    label: "Sent back to agent",
    icon: RotateCcw,
    bgColor: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  forwarded_to_legal: {
    label: "Sent to Legal Review",
    icon: Scale,
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  forwarded_to_finance: {
    label: "Sent to Finance Review",
    icon: DollarSign,
    bgColor: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  forwarded_to_approver: {
    label: "Sent for Final Approval",
    icon: Send,
    bgColor: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  approved: {
    label: "Approved",
    icon: BadgeCheck,
    bgColor: "bg-green-100",
    iconColor: "text-green-700",
  },
  denied: {
    label: "Denied",
    icon: XCircle,
    bgColor: "bg-red-100",
    iconColor: "text-red-600",
  },
  erp_encoded: {
    label: "Customer Onboarded",
    icon: Database,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-700",
  },
};

const ROLE_LABELS: Record<string, string> = {
  sales_agent: "Sales Agent",
  rsr: "RSR",
  sales_manager: "Sales Manager",
  rsr_manager: "RSR Manager",
  finance_reviewer: "Finance Reviewer",
  legal_approver: "Legal Approver",
  senior_approver: "Senior Approver",
  sales_support: "Sales Support",
  admin: "Admin",
};

interface EventEntry {
  id: string;
  action: WorkflowAction;
  note: string | null;
  createdAt: Date;
  actorName: string;
  actorRole?: string | null;
  actorAvatarUrl?: string | null;
}

interface AuditTimelineProps {
  events: EventEntry[];
}

function ActorAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={22}
        height={22}
        className="h-5.5 w-5.5 rounded-full object-cover shrink-0"
        unoptimized
      />
    );
  }

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2d6e1e] text-[9px] font-bold text-white">
      {initials}
    </span>
  );
}

export function AuditTimeline({ events }: AuditTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-zinc-400">No activity recorded yet.</p>
    );
  }

  return (
    <ol className="space-y-0">
      {events.map((event, idx) => {
        const config = ACTION_CONFIG[event.action];
        const Icon = config?.icon ?? FileText;
        const isLast = idx === events.length - 1;

        return (
          <li key={event.id} className="flex gap-4">
            {/* Left: icon + connector line */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config?.bgColor ?? "bg-zinc-100"}`}
              >
                <Icon className={`h-4 w-4 ${config?.iconColor ?? "text-zinc-500"}`} />
              </div>
              {!isLast && <div className="mt-1 w-px flex-1 bg-zinc-100" />}
            </div>

            {/* Right: content */}
            <div className={`min-w-0 pb-5 ${isLast ? "pb-0" : ""}`}>
              <p className="text-sm font-semibold text-zinc-900">
                {config?.label ?? event.action}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <ActorAvatar name={event.actorName} avatarUrl={event.actorAvatarUrl} />
                <p className="text-xs text-zinc-500">
                  <span className="font-medium text-zinc-700">{event.actorName}</span>
                  {event.actorRole && (
                    <>
                      {" · "}
                      <span className="text-zinc-400">
                        {ROLE_LABELS[event.actorRole] ?? event.actorRole}
                      </span>
                    </>
                  )}
                  {" · "}
                  {formatDistanceToNow(event.createdAt)}
                </p>
              </div>
              {event.note && (
                <p className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600">
                  {event.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
