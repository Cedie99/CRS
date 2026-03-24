import { formatDistanceToNow } from "@/lib/utils";

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

const ACTION_LABELS: Record<WorkflowAction, string> = {
  submitted: "Submitted",
  endorsed: "Endorsed",
  returned: "Returned to agent",
  forwarded_to_legal: "Forwarded to Legal Review",
  forwarded_to_finance: "Forwarded to Finance",
  forwarded_to_approver: "Forwarded to Senior Approver",
  approved: "Approved",
  denied: "Denied",
  erp_encoded: "ERP Encoded",
};

const ACTION_COLORS: Record<WorkflowAction, string> = {
  submitted: "bg-blue-400",
  endorsed: "bg-green-400",
  returned: "bg-rose-400",
  forwarded_to_legal: "bg-purple-400",
  forwarded_to_finance: "bg-amber-400",
  forwarded_to_approver: "bg-orange-400",
  approved: "bg-green-500",
  denied: "bg-red-500",
  erp_encoded: "bg-green-600",
};

interface EventEntry {
  id: string;
  action: WorkflowAction;
  note: string | null;
  createdAt: Date;
  actorName: string;
}

interface AuditTimelineProps {
  events: EventEntry[];
}

export function AuditTimeline({ events }: AuditTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-zinc-400">No activity recorded yet.</p>;
  }

  return (
    <ol className="relative border-l border-zinc-200">
      {events.map((event) => (
        <li key={event.id} className="mb-6 ml-4 last:mb-0">
          <span
            className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white ${ACTION_COLORS[event.action]}`}
          />
          <p className="text-sm font-medium text-zinc-900">
            {ACTION_LABELS[event.action]}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            by{" "}
            <span className="font-medium text-zinc-700">{event.actorName}</span>
            {" · "}
            {formatDistanceToNow(event.createdAt)}
          </p>
          {event.note && (
            <p className="mt-1.5 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              {event.note}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
