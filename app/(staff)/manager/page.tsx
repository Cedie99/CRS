import { eq, ne, desc, and, inArray, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { CisCard } from "@/components/cis-card";
import { DashboardFilters } from "@/components/dashboard-filters";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, ClipboardCheck, Clock, CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";

export const metadata = { title: "Team Submissions — CRS" };

const IN_PROGRESS_STATUSES: CisStatus[] = [
  "submitted",
  "pending_legal_review",
  "pending_finance_review",
  "pending_approval",
  "approved",
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
  searchParams: Promise<{ q?: string; status?: string; agentId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q, status, agentId } = await searchParams;

  const myAgents = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.managerId, session.user.id));

  const agentIds = myAgents.map((a) => a.id);

  // Resolve agent name for agentId filter banner (verify agent belongs to this manager)
  let agentFilterName: string | null = null;
  if (agentId) {
    const agentRows = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(and(eq(users.id, agentId), eq(users.managerId, session.user.id)))
      .limit(1);
    agentFilterName = agentRows[0]?.fullName ?? null;
  }

  if (agentIds.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 p-2.5">
            <ClipboardCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">My Team&apos;s Submissions</h1>
            <p className="mt-0.5 text-sm text-zinc-500">All customer submissions from your agents.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <div className="rounded-full bg-zinc-100 p-4">
            <FileText className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No agents assigned</h2>
          <p className="mt-1 text-sm text-zinc-500">
            No agents are assigned to you yet. Contact your admin.
          </p>
        </div>
      </div>
    );
  }

  // Stats (unfiltered)
  const allSubmissions = await db
    .select({ status: cisSubmissions.status })
    .from(cisSubmissions)
    .where(inArray(cisSubmissions.agentId, agentIds));

  const total = allSubmissions.length;
  const pendingCount = allSubmissions.filter((s) => s.status === "pending_endorsement").length;
  const inProgressCount = allSubmissions.filter((s) =>
    IN_PROGRESS_STATUSES.includes(s.status as CisStatus)
  ).length;
  const erpCount = allSubmissions.filter((s) => s.status === "erp_encoded").length;
  const deniedCount = allSubmissions.filter(
    (s) => s.status === "denied" || s.status === "returned"
  ).length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const stats = [
    {
      label: "Needs Review",
      value: pendingCount,
      sub: total > 0 ? `${pct(pendingCount)}% of total` : "none yet",
      icon: ClipboardCheck,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      valueColor: "text-amber-700",
      barColor: "bg-amber-400",
      percent: pct(pendingCount),
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

  // Section 1: Action queue — pending_endorsement only, search-aware
  const actionConditions: any[] = [
    inArray(cisSubmissions.agentId, agentIds),
    eq(cisSubmissions.status, "pending_endorsement"),
  ];
  if (agentId && agentFilterName) {
    actionConditions.push(eq(cisSubmissions.agentId, agentId));
  }
  if (q) {
    actionConditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )!
    );
  }

  const actionQueue = await db
    .select(SUBMISSION_COLS)
    .from(cisSubmissions)
    .innerJoin(users, eq(cisSubmissions.agentId, users.id))
    .where(and(...actionConditions))
    .orderBy(desc(cisSubmissions.createdAt));

  // Section 2: Team history — everything except pending_endorsement, with status + search filter
  const historyConditions: any[] = [
    inArray(cisSubmissions.agentId, agentIds),
    ne(cisSubmissions.status, "pending_endorsement"),
  ];
  if (agentId && agentFilterName) {
    historyConditions.push(eq(cisSubmissions.agentId, agentId));
  }
  if (status) {
    historyConditions.push(eq(cisSubmissions.status, status as CisStatus));
  }
  if (q) {
    historyConditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )!
    );
  }

  const history = await db
    .select(SUBMISSION_COLS)
    .from(cisSubmissions)
    .innerJoin(users, eq(cisSubmissions.agentId, users.id))
    .where(and(...historyConditions))
    .orderBy(desc(cisSubmissions.createdAt));

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
            <h1 className="text-2xl font-bold text-zinc-900">My Team&apos;s Submissions</h1>
            <p className="mt-0.5 text-sm text-zinc-500">All customer submissions from your agents.</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
            {pendingCount} need{pendingCount === 1 ? "s" : ""} your review
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, iconBg, iconColor, valueColor, barColor, percent }) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-xl border bg-white p-5 transition-all duration-200 hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {label}
                </p>
                <p className={`mt-1.5 text-3xl font-bold tabular-nums ${valueColor}`}>{value}</p>
                <p className="mt-1 text-xs text-zinc-400">{sub}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
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

      {/* ── Section 1: Action Queue ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-zinc-700">Needs Your Review</h2>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {pendingCount}
            </span>
          )}
        </div>

        {actionQueue.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed bg-white px-5 py-4 text-sm text-zinc-400">
            <CheckCircle className="h-4 w-4 shrink-0 text-green-400" />
            {q ? "No pending endorsements match your search." : "Queue is clear — nothing to endorse right now."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {actionQueue.map((s) => (
              <CisCard
                key={s.id}
                id={s.id}
                tradeName={s.tradeName}
                contactPerson={s.contactPerson}
                customerType={s.customerType}
                agentCode={s.agentCode}
                agentName={s.agentName}
                status={s.status as CisStatus}
                createdAt={s.createdAt}
                updatedAt={s.updatedAt}
                href={`/manager/${s.id}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Team History ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-700">Team History</h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
            {total - pendingCount} submission{total - pendingCount !== 1 ? "s" : ""}
          </span>
        </div>

        <DashboardFilters showStatusFilter />

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-16 text-center">
            <div className="rounded-full bg-zinc-100 p-4">
              <FileText className="h-8 w-8 text-zinc-400" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-zinc-900">
              {q || status ? "No matching submissions" : "No history yet"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {q || status
                ? "Try adjusting your search or filters."
                : "Endorsed and processed submissions will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((s) => (
              <CisCard
                key={s.id}
                id={s.id}
                tradeName={s.tradeName}
                contactPerson={s.contactPerson}
                customerType={s.customerType}
                agentCode={s.agentCode}
                agentName={s.agentName}
                status={s.status as CisStatus}
                createdAt={s.createdAt}
                updatedAt={s.updatedAt}
                href={`/manager/${s.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
