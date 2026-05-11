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
import { FileText, Activity, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";

export const metadata = { title: "Admin — All Submissions — CRS" };

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

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { page, q, status } = await searchParams;
  const pageSize = 20;
  const currentPage = getPageNumber(page);
  const offset = (currentPage - 1) * pageSize;

  // Stats — single aggregate query, no filters
  const [statsRow] = await db
    .select({
      total: count(),
      active: count(sql`CASE WHEN ${cisSubmissions.status} IN ('submitted','pending_endorsement','pending_legal_review','pending_finance_review','pending_approval','approved','pending_erp_encoding') THEN 1 END`),
      done: count(sql`CASE WHEN ${cisSubmissions.status} = 'erp_encoded' THEN 1 END`),
      closed: count(sql`CASE WHEN ${cisSubmissions.status} IN ('denied','returned') THEN 1 END`),
    })
    .from(cisSubmissions);

  const total = Number(statsRow?.total ?? 0);
  const active = Number(statsRow?.active ?? 0);
  const done = Number(statsRow?.done ?? 0);
  const closed = Number(statsRow?.closed ?? 0);

  // Submissions — filtered + paginated
  const conditions: any[] = [];
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
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [submissions, countRow, pendingUsers] = await Promise.all([
    db
      .select({
        id: cisSubmissions.id,
        customerType: cisSubmissions.customerType,
        status: cisSubmissions.status,
        tradeName: cisSubmissions.tradeName,
        agentCode: cisSubmissions.agentCode,
        createdAt: cisSubmissions.createdAt,
      })
      .from(cisSubmissions)
      .where(whereClause)
      .orderBy(desc(cisSubmissions.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(cisSubmissions).where(whereClause),
    db
      .select({ id: users.id, fullName: users.fullName, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.isActive, false))
      .orderBy(users.createdAt),
  ]);

  const totalSubmissions = Number(countRow[0]?.total ?? 0);
  const pendingCount = pendingUsers.length;

  const stats = [
    { label: "Total", value: total, icon: FileText, iconBg: "bg-zinc-100", iconColor: "text-zinc-500" },
    { label: "In Progress", value: active, icon: Activity, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
    { label: "Approved / Onboarded", value: done, icon: CheckCircle2, iconBg: "bg-green-50", iconColor: "text-green-600" },
    { label: "Denied / Returned", value: closed, icon: XCircle, iconBg: "bg-red-50", iconColor: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">All Submissions</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Overview of all customer submissions across the entire system.
          </p>
        </div>
      </div>

      {/* Pending activations banner */}
      {pendingCount > 0 && (
        <Link
          href="/admin/users"
          className="flex flex-col items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 transition-colors hover:bg-amber-100 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <UserPlus className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {pendingCount} account{pendingCount !== 1 ? "s" : ""} pending activation
              </p>
              <p className="text-xs text-amber-600">
                {pendingUsers.map((u) => u.fullName).slice(0, 3).join(", ")}
                {pendingCount > 3 ? ` and ${pendingCount - 3} more` : ""}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-medium text-amber-700 hover:underline">
            Review →
          </span>
        </Link>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700">Performance Snapshot</h2>
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
            All Submissions
            {(q || status) && totalSubmissions !== total && (
              <span className="ml-2 font-normal text-zinc-400">({totalSubmissions} matching)</span>
            )}
          </h2>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {submissions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-400">
              No submissions yet.
            </div>
          ) : (
            submissions.map((s) => {
              const customerType = s.customerType ?? "end_user";

              return (
              <Link
                key={s.id}
                href={`/admin/${s.id}`}
                className="block rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-zinc-900">
                    {s.tradeName ?? <span className="font-normal italic text-zinc-400">Untitled</span>}
                  </p>
                  <StatusBadge status={s.status as any} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
                    {s.agentCode}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      CUSTOMER_TYPE_COLORS[customerType] ?? "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {CUSTOMER_TYPE_LABELS[customerType] ?? humanizeDisplayValue(customerType)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">Submitted {formatDistanceToNow(s.createdAt)} ago</p>
              </Link>
              );
            })
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-140 w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Trade Name
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
                  Submitted
                </th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-zinc-400">
                    No submissions yet.
                  </td>
                </tr>
              ) : (
                submissions.map((s) => {
                  const customerType = s.customerType ?? "end_user";

                  return (
                  <tr key={s.id} className="group hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-zinc-900">
                      {s.tradeName ?? <span className="font-normal italic text-zinc-400">Untitled</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
                        {s.agentCode}
                      </span>
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
                    <td className="px-5 py-3.5 text-xs text-zinc-400">
                      {formatDistanceToNow(s.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/admin/${s.id}`}
                        className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 ring-1 ring-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
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
        basePath="/admin"
        currentPage={currentPage}
        totalItems={totalSubmissions}
        pageSize={pageSize}
        searchParams={{ q, status }}
      />
    </div>
  );
}
