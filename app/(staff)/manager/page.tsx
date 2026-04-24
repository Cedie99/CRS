import { eq, desc, and, inArray, ilike, or, count, sql, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { CustomerTypeNavCards } from "@/components/customer-type-nav-cards";
import { getPageNumber } from "@/components/dashboard-pagination";
import { DashboardFilters } from "@/components/dashboard-filters";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck, Clock, CheckCircle, XCircle, X, FileText, Activity } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";
import { EmptyStateLogo } from "@/components/empty-state-logo";

export const metadata = { title: "Team Submissions — CRS" };

const IN_PROGRESS_STATUSES: CisStatus[] = [
  "submitted",
  "pending_legal_review",
  "pending_finance_review",
  "pending_approval",
  "approved",
  "pending_erp_encoding",
];

const SUBMISSION_COLS = {
  id: cisSubmissions.id,
  tradeName: cisSubmissions.tradeName,
  contactPerson: cisSubmissions.contactPerson,
  customerType: cisSubmissions.customerType,
  agentCode: cisSubmissions.agentCode,
  agentId: cisSubmissions.agentId,
  status: cisSubmissions.status,
  createdAt: cisSubmissions.createdAt,
  updatedAt: cisSubmissions.updatedAt,
  agentName: users.fullName,
};

export default async function ManagerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; agentId?: string; queuePage?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q, status, agentId, queuePage } = await searchParams;
  const queueCurrentPage = getPageNumber(queuePage);
  const pageSize = 12;
  const queueOffset = (queueCurrentPage - 1) * pageSize;

  // Run independent queries in parallel: myAgents is always needed, agentFilterName only when filtering
  const [myAgents, agentFilterRows] = await Promise.all([
    db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.managerId, session.user.id)),
    agentId
      ? db
          .select({ fullName: users.fullName })
          .from(users)
          .where(and(eq(users.id, agentId), eq(users.managerId, session.user.id)))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const agentIds = myAgents.map((a) => a.id);
  const agentFilterName: string | null = agentFilterRows[0]?.fullName ?? null;

  if (agentIds.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 p-2.5">
            <ClipboardCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">My Team&apos;s Submissions</h1>
            <p className="mt-0.5 text-sm text-zinc-500">All customer submissions from your agents.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No agents assigned</h2>
          <p className="mt-1 text-sm text-zinc-500">
            No agents are assigned to you yet. Contact your admin.
          </p>
        </div>
      </div>
    );
  }

  // Stats + action queue in parallel (both depend on agentIds which is now ready)
  const [statsRows, actionResults] = await Promise.all([
    db
      .select({
        total: count(),
        activeCount: count(sql`CASE WHEN ${cisSubmissions.status} NOT IN ('draft','erp_encoded','denied','returned') THEN 1 END`),
        inProgressCount: count(sql`CASE WHEN ${cisSubmissions.status} IN ('submitted','pending_legal_review','pending_finance_review','pending_approval','approved','pending_erp_encoding') THEN 1 END`),
        erpCount: count(sql`CASE WHEN ${cisSubmissions.status} = 'erp_encoded' THEN 1 END`),
        deniedCount: count(sql`CASE WHEN ${cisSubmissions.status} IN ('denied','returned') THEN 1 END`),
      })
      .from(cisSubmissions)
      .where(inArray(cisSubmissions.agentId, agentIds)),
    // Build action query inline so it runs in parallel with stats
    (async () => {
      const actionConditions: any[] = [
        inArray(cisSubmissions.agentId, agentIds),
        ne(cisSubmissions.status, "draft"),
      ];
      if (agentId && agentFilterName) {
        actionConditions.push(eq(cisSubmissions.agentId, agentId));
      }
      if (status) {
        actionConditions.push(eq(cisSubmissions.status, status as CisStatus));
      }
      if (q) {
        actionConditions.push(
          or(
            ilike(cisSubmissions.tradeName, `%${q}%`),
            ilike(cisSubmissions.contactPerson, `%${q}%`)
          )!
        );
      }
      return Promise.all([
        db
          .select(SUBMISSION_COLS)
          .from(cisSubmissions)
          .innerJoin(users, eq(cisSubmissions.agentId, users.id))
          .where(and(...actionConditions))
          .orderBy(desc(cisSubmissions.createdAt))
          .limit(pageSize)
          .offset(queueOffset),
        db
          .select({ total: count() })
          .from(cisSubmissions)
          .where(and(...actionConditions)),
      ]);
    })(),
  ]);
  const statsRow = statsRows[0];
  const [actionQueue, actionCountRow] = actionResults;

  const total = Number(statsRow?.total ?? 0);
  const activeCount = Number(statsRow?.activeCount ?? 0);
  const inProgressCount = Number(statsRow?.inProgressCount ?? 0);
  const erpCount = Number(statsRow?.erpCount ?? 0);
  const deniedCount = Number(statsRow?.deniedCount ?? 0);
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const stats = [
    {
      label: "Active",
      value: activeCount,
      sub: total > 0 ? `${pct(activeCount)}% of total` : "none yet",
      icon: ClipboardCheck,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      valueColor: "text-amber-700",
      barColor: "bg-amber-400",
      percent: pct(activeCount),
    },
    {
      label: "In Progress",
      value: inProgressCount,
      sub: total > 0 ? `${pct(inProgressCount)}% of total` : "none yet",
      icon: Clock,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      valueColor: "text-blue-700",
      barColor: "bg-blue-400",
      percent: pct(inProgressCount),
    },
    {
      label: "Onboarded",
      value: erpCount,
      sub: total > 0 ? `${pct(erpCount)}% of total` : "none yet",
      icon: CheckCircle,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      valueColor: "text-green-700",
      barColor: "bg-green-500",
      percent: pct(erpCount),
    },
    {
      label: "Not Accepted",
      value: deniedCount,
      sub: total > 0 ? `${pct(deniedCount)}% of total` : "none yet",
      icon: XCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      valueColor: "text-red-700",
      barColor: "bg-red-400",
      percent: pct(deniedCount),
    },
  ];

  const actionTotal = Number(actionCountRow[0]?.total ?? 0);

  // Clear-agent-filter URL (preserves q and status)
  const clearAgentParams = new URLSearchParams();
  if (q) clearAgentParams.set("q", q);
  if (status) clearAgentParams.set("status", status);
  const clearAgentUrl = `/manager${clearAgentParams.toString() ? `?${clearAgentParams.toString()}` : ""}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 p-2.5">
            <ClipboardCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">My Team&apos;s Submissions</h1>
            <p className="mt-0.5 text-sm text-zinc-500">All customer submissions from your agents.</p>
          </div>
        </div>
        {activeCount > 0 && (
          <span className="mt-7 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-linear-to-r from-blue-50 to-blue-100/80 px-3.5 py-1.5 text-sm font-semibold text-blue-800 shadow-sm sm:mt-8">
            <Activity className="h-3.5 w-3.5 text-blue-700" />
            <span>{activeCount} Active</span>
          </span>
        )}
      </div>

      <DashboardFilters showStatusFilter />

      {/* Stats */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700">Performance Snapshot</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 p-3 sm:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, iconBg, iconColor, valueColor, barColor, percent }) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-lg border bg-zinc-50 p-3 transition-all duration-200 hover:border-zinc-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {label}
                </p>
                <p className={`mt-2 text-2xl font-bold tabular-nums sm:text-3xl ${valueColor}`}>{value}</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">{sub}</p>
              </div>
              <div className={`rounded-xl p-2 ${iconBg} sm:p-2.5`}>
                <Icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${iconColor}`} />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100">
              <div
                className={`h-full transition-all duration-700 ${barColor}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ))}
        </div>
      </div>

      <CustomerTypeNavCards
        basePath="/manager"
        searchParams={{ q, status, agentId }}
        submissions={actionQueue}
      />

      {/* Agent filter banner */}
      {agentFilterName && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <span>
            Showing submissions for: <strong>{agentFilterName}</strong>
          </span>
          <Link
            href={clearAgentUrl}
            className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-blue-600 hover:bg-blue-100"
          >
            <X className="h-3.5 w-3.5" />
            Clear filter
          </Link>
        </div>
      )}

      {actionTotal === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed bg-white px-5 py-4 text-sm text-zinc-400">
          <CheckCircle className="h-4 w-4 shrink-0 text-green-400" />
          {q || status ? "No submissions match your search or filter." : "No submissions yet from your team."}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <strong className="text-zinc-800">Highlighted cards</strong> have submissions from your team. Select one to open its list.
        </div>
      )}

    </div>
  );
}
