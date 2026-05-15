import Link from "next/link";
import { desc, eq, count, sql, ilike, or, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { StatusBadge } from "@/components/status-badge";
import { DashboardPagination, getPageNumber } from "@/components/dashboard-pagination";
import { DashboardFilters } from "@/components/dashboard-filters";
import { redirect } from "next/navigation";
import { formatDistanceToNow, humanizeDisplayValue } from "@/lib/utils";
import { FileText, Activity, CheckCircle2, XCircle } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";

export const metadata = { title: "All Records — CRS" };

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  dealer: "Dealer",
  distributor: "Distributor",
  private_label: "Private Label",
  toll_blend: "Toll Blend",
  end_user: "End-User",
};

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  dealer: "bg-blue-50 text-blue-700",
  distributor: "bg-teal-50 text-teal-700",
  private_label: "bg-violet-50 text-violet-700",
  toll_blend: "bg-orange-50 text-orange-700",
  end_user: "bg-green-50 text-green-700",
};

const STATUS_DEPARTMENT: Record<string, { label: string; color: string }> = {
  draft:                   { label: "Agent",           color: "text-zinc-500" },
  submitted:               { label: "Agent",           color: "text-blue-600" },
  pending_legal_review:    { label: "Legal",           color: "text-violet-600" },
  pending_finance_review:  { label: "Finance",         color: "text-teal-600" },
  pending_endorsement:     { label: "Finance",         color: "text-teal-600" },
  pending_approval:        { label: "Senior Approver", color: "text-amber-600" },
  approved:                { label: "Sales Support",   color: "text-emerald-600" },
  pending_erp_encoding:    { label: "Specialist",      color: "text-indigo-600" },
  erp_encoded:             { label: "Complete",        color: "text-green-600" },
  denied:                  { label: "Closed",          color: "text-red-500" },
  returned:                { label: "Agent",           color: "text-orange-500" },
};

export default async function AgentRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const agentId = session.user.id;
  const { page, q, status } = await searchParams;
  const pageSize = 20;
  const currentPage = getPageNumber(page);
  const offset = (currentPage - 1) * pageSize;

  // Stats — all records for this agent
  const [statsRow] = await db
    .select({
      total: count(),
      active: count(sql`CASE WHEN ${cisSubmissions.status} IN ('submitted','pending_endorsement','pending_legal_review','pending_finance_review','pending_approval','approved','pending_erp_encoding') THEN 1 END`),
      done: count(sql`CASE WHEN ${cisSubmissions.status} = 'erp_encoded' THEN 1 END`),
      closed: count(sql`CASE WHEN ${cisSubmissions.status} IN ('denied','returned') THEN 1 END`),
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.agentId, agentId));

  const total = Number(statsRow?.total ?? 0);
  const active = Number(statsRow?.active ?? 0);
  const done = Number(statsRow?.done ?? 0);
  const closed = Number(statsRow?.closed ?? 0);

  // Filtered + paginated submissions
  const conditions: any[] = [eq(cisSubmissions.agentId, agentId)];
  if (q) {
    conditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )!
    );
  }
  if (status) {
    conditions.push(eq(cisSubmissions.status, status as CisStatus));
  }
  const whereClause = and(...conditions);

  const [submissions, countRow] = await Promise.all([
    db
      .select({
        id: cisSubmissions.id,
        customerType: cisSubmissions.customerType,
        status: cisSubmissions.status,
        tradeName: cisSubmissions.tradeName,
        contactPerson: cisSubmissions.contactPerson,
        agentCode: cisSubmissions.agentCode,
        agentType: cisSubmissions.agentType,
        agentName: users.fullName,
        createdAt: cisSubmissions.createdAt,
        updatedAt: cisSubmissions.updatedAt,
      })
      .from(cisSubmissions)
      .leftJoin(users, eq(cisSubmissions.agentId, users.id))
      .where(whereClause)
      .orderBy(desc(cisSubmissions.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(cisSubmissions).where(whereClause),
  ]);

  const totalSubmissions = Number(countRow[0]?.total ?? 0);

  const stats = [
    { label: "Total", value: total, icon: FileText, iconBg: "bg-zinc-100", iconColor: "text-zinc-500" },
    { label: "In Progress", value: active, icon: Activity, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
    { label: "Onboarded", value: done, icon: CheckCircle2, iconBg: "bg-green-50", iconColor: "text-green-600" },
    { label: "Denied / Returned", value: closed, icon: XCircle, iconBg: "bg-red-50", iconColor: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">All Records</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          All your customer submissions and their current status across the workflow.
        </p>
      </div>

      {/* Stats */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700">Overview</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 p-3 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
                  <p className="mt-1.5 text-xl font-bold tabular-nums text-zinc-900">{value}</p>
                </div>
                <div className={`rounded-lg p-1.5 ${iconBg}`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DashboardFilters showStatusFilter />

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-zinc-700">
            Submissions
            {(q || status) && totalSubmissions !== total && (
              <span className="ml-2 font-normal text-zinc-400">({totalSubmissions} matching)</span>
            )}
          </h2>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 p-3 md:hidden">
          {submissions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-400">
              No submissions found.
            </div>
          ) : (
            submissions.map((s) => {
              const customerType = s.customerType ?? "end_user";
              const dept = STATUS_DEPARTMENT[s.status] ?? { label: "—", color: "text-zinc-400" };

              return (
                <Link
                  key={s.id}
                  href={`/agent/${s.id}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-zinc-900">
                      {s.tradeName ?? <span className="font-normal italic text-zinc-400">Untitled</span>}
                    </p>
                    <StatusBadge status={s.status as any} />
                  </div>
                  {s.contactPerson && (
                    <p className="mt-1 truncate text-xs text-zinc-500">{s.contactPerson}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
                      {s.agentCode}
                    </span>
                    {s.agentName && (
                      <span className="text-xs text-zinc-500">{s.agentName}</span>
                    )}
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        CUSTOMER_TYPE_COLORS[customerType] ?? "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {CUSTOMER_TYPE_LABELS[customerType] ?? humanizeDisplayValue(customerType)}
                    </span>
                    <span className={`text-xs font-medium ${dept.color}`}>{dept.label}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">
                    Updated {formatDistanceToNow(s.updatedAt)} ago
                  </p>
                </Link>
              );
            })
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Trade Name
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Contact Person
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Agent
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Type
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Current Dept.
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Last Updated
                </th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm text-zinc-400">
                    No submissions found.
                  </td>
                </tr>
              ) : (
                submissions.map((s) => {
                  const customerType = s.customerType ?? "end_user";
                  const dept = STATUS_DEPARTMENT[s.status] ?? { label: "—", color: "text-zinc-400" };

                  return (
                    <tr key={s.id} className="group transition-colors hover:bg-zinc-50">
                      <td className="px-5 py-3.5 font-semibold text-zinc-900">
                        {s.tradeName ?? <span className="font-normal italic text-zinc-400">Untitled</span>}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500">
                        {s.contactPerson ?? <span className="italic text-zinc-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          {s.agentName && (
                            <span className="text-sm font-medium text-zinc-800">{s.agentName}</span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
                              {s.agentCode}
                            </span>
                            {s.agentType && (
                              <span className="text-[11px] text-zinc-400 uppercase tracking-wide">
                                {s.agentType === "rsr" ? "RSR" : "Agent"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            CUSTOMER_TYPE_COLORS[customerType] ?? "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {CUSTOMER_TYPE_LABELS[customerType] ?? humanizeDisplayValue(customerType)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={s.status as any} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold ${dept.color}`}>{dept.label}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-400">
                        {formatDistanceToNow(s.updatedAt)} ago
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/agent/${s.id}`}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DashboardPagination
        basePath="/agent/records"
        currentPage={currentPage}
        totalItems={totalSubmissions}
        pageSize={pageSize}
        searchParams={{ q, status }}
      />
    </div>
  );
}
