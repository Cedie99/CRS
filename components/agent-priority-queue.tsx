import Link from "next/link";
import { AlertTriangle, ChevronRight, ClipboardList, RotateCcw } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";

type QueueItem = {
  id: string;
  tradeName: string | null;
  contactPerson: string | null;
  status: CisStatus;
};

interface AgentPriorityQueueProps {
  returned: QueueItem[];
  returnedTotal: number;
  completion: QueueItem[];
  completionTotal: number;
}

const MOBILE_PREVIEW_LIMIT = 3;

function CompactActionRow({
  item,
  href,
  cta,
  tone,
}: {
  item: QueueItem;
  href: string;
  cta: string;
  tone: "rose" | "blue";
}) {
  const iconTone =
    tone === "rose"
      ? "bg-rose-100 text-rose-600"
      : "bg-blue-100 text-blue-600";
  const ctaTone = tone === "rose" ? "text-rose-700" : "text-blue-700";

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-white/80 bg-white px-3 py-2.5 shadow-sm transition-colors active:bg-zinc-50"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconTone}`}>
        {tone === "rose" ? (
          <RotateCcw className="h-4 w-4" />
        ) : (
          <ClipboardList className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900">
          {item.tradeName?.trim() || "Untitled form"}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {item.contactPerson?.trim() || "No contact name"}
        </p>
      </div>
      <span className={`flex shrink-0 items-center gap-0.5 text-xs font-semibold ${ctaTone}`}>
        {cta}
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function QueueBlock({
  title,
  description,
  items,
  total,
  viewAllHref,
  viewAllLabel,
  tone,
  cta,
}: {
  title: string;
  description: string;
  items: QueueItem[];
  total: number;
  viewAllHref: string;
  viewAllLabel: string;
  tone: "rose" | "blue";
  cta: string;
}) {
  if (total === 0) return null;

  const preview = items.slice(0, MOBILE_PREVIEW_LIMIT);
  const overflow = total - preview.length;
  const shellTone =
    tone === "rose"
      ? "border-rose-300 bg-linear-to-b from-rose-50 to-rose-50/40"
      : "border-blue-300 bg-linear-to-b from-blue-50 to-blue-50/40";
  const badgeTone =
    tone === "rose" ? "bg-rose-600 text-white" : "bg-blue-600 text-white";

  return (
    <section className={`rounded-xl border-2 p-3 ${shellTone}`}>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
          <p className="mt-0.5 text-xs text-zinc-600">{description}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${badgeTone}`}>
          {total}
        </span>
      </div>

      <div className="space-y-2">
        {preview.map((item) => (
          <CompactActionRow
            key={item.id}
            item={item}
            href={`/agent/${item.id}`}
            cta={cta}
            tone={tone}
          />
        ))}
      </div>

      {overflow > 0 && (
        <Link
          href={viewAllHref}
          className="mt-2.5 flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
        >
          {viewAllLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </section>
  );
}

export function AgentPriorityQueue({
  returned,
  returnedTotal,
  completion,
  completionTotal,
}: AgentPriorityQueueProps) {
  const totalActions = returnedTotal + completionTotal;
  if (totalActions === 0) return null;

  return (
    <div className="space-y-3 lg:hidden">
      <div className="flex items-center gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-950">Action required before anything else</p>
          <p className="mt-0.5 text-xs text-amber-800">
            {totalActions === 1
              ? "1 form needs your attention right now."
              : `${totalActions} forms need your attention right now.`}
          </p>
        </div>
      </div>

      <QueueBlock
        title="Returned — fix and resubmit"
        description="Forms sent back for corrections."
        items={returned}
        total={returnedTotal}
        viewAllHref="/agent?status=returned"
        viewAllLabel={`View all ${returnedTotal} returned forms`}
        tone="rose"
        cta="Resubmit"
      />

      <QueueBlock
        title="Complete your section"
        description="Customers submitted — finish the agent fill-out."
        items={completion}
        total={completionTotal}
        viewAllHref="/agent/agent-completion"
        viewAllLabel={`View all ${completionTotal} forms to complete`}
        tone="blue"
        cta="Fill out"
      />
    </div>
  );
}
