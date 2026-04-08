import { desc, and, ilike, or, count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { CustomerTypeColumns } from "@/components/customer-type-columns";
import { DashboardPagination, getPageNumber } from "@/components/dashboard-pagination";
import { DashboardFilters } from "@/components/dashboard-filters";
import { redirect } from "next/navigation";
import { FileText, Database, XCircle, CheckCircle2, Clock, LayoutList } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";

export const metadata = { title: "Sales Support — CRS" };

export default async function SupportDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q, page } = await searchParams;
  const currentPage = getPageNumber(page);
  const pageSize = 12;
  const offset = (currentPage - 1) * pageSize;

  const searchConditions: any[] = [];

  if (q) {
    searchConditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )
    );
  }

  const pendingConditions = [eq(cisSubmissions.status, "approved"), ...searchConditions];
  const encodedConditions = [eq(cisSubmissions.status, "erp_encoded"), ...searchConditions];
  const deniedConditions = [eq(cisSubmissions.status, "denied"), ...searchConditions];

  const [pendingEncoding, pendingCountRow, encoded, encodedCountRow, denied, deniedCountRow] = await Promise.all([
    db
      .select()
      .from(cisSubmissions)
      .where(and(...pendingConditions))
      .orderBy(desc(cisSubmissions.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...pendingConditions)),
    db
      .select()
      .from(cisSubmissions)
      .where(and(...encodedConditions))
      .orderBy(desc(cisSubmissions.updatedAt))
      .limit(6),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...encodedConditions)),
    db
      .select()
      .from(cisSubmissions)
      .where(and(...deniedConditions))
      .orderBy(desc(cisSubmissions.updatedAt))
      .limit(6),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...deniedConditions)),
  ]);

  const pendingTotal = Number(pendingCountRow[0]?.total ?? 0);
  const encodedTotal = Number(encodedCountRow[0]?.total ?? 0);
  const deniedTotal = Number(deniedCountRow[0]?.total ?? 0);
  const total = pendingTotal + encodedTotal + deniedTotal;

  const stats = [
    {
      label: "Ready to Onboard",
      value: pendingTotal,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
    },
    {
      label: "Onboarded",
      value: encodedTotal,
      icon: Database,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Denied",
      value: deniedTotal,
      icon: XCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
    },
    {
      label: "Total",
      value: total,
      icon: LayoutList,
      iconBg: "bg-zinc-100",
      iconColor: "text-zinc-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Sales Support</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Enter approved customers into the system and review denied forms.
        </p>
      </div>

      <DashboardFilters showStatusFilter={false} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="rounded-xl border bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900 sm:text-3xl">{value}</p>
              </div>
              <div className={`rounded-xl p-2 ${iconBg} sm:p-2.5`}>
                <Icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending ERP encoding */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-50 p-1.5">
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-800">Ready to Onboard</h2>
            <p className="text-xs text-zinc-500">Approved customers waiting to be entered into the system</p>
          </div>
          {pendingTotal > 0 && (
            <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              {pendingTotal}
            </span>
          )}
        </div>
        {pendingTotal === 0 ? (
          <div className="rounded-xl border border-dashed bg-white py-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-green-300" />
            <p className="mt-2 text-sm font-medium text-zinc-600">All clear!</p>
            <p className="text-xs text-zinc-400">No approved customers are waiting to be onboarded.</p>
          </div>
        ) : (
          <>
            <CustomerTypeColumns
              submissions={pendingEncoding.map((s) => ({
                ...s,
                status: s.status as CisStatus,
              }))}
              hrefPrefix="support"
            />
            <DashboardPagination
              basePath="/support"
              currentPage={currentPage}
              totalItems={pendingTotal}
              pageSize={pageSize}
              searchParams={{ q }}
            />
          </>
        )}
      </section>

      {/* Recently encoded */}
      {encodedTotal > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-1.5">
              <Database className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-800">Recently Onboarded</h2>
              <p className="text-xs text-zinc-500">Last {Math.min(encodedTotal, 6)} completed customers</p>
            </div>
          </div>
          <CustomerTypeColumns
            submissions={encoded.slice(0, 6).map((s) => ({
              ...s,
              status: s.status as CisStatus,
            }))}
            hrefPrefix="support"
          />
        </section>
      )}

      {/* Denied */}
      {deniedTotal > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-1.5">
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-800">Denied Submissions</h2>
              <p className="text-xs text-zinc-500">Last {Math.min(deniedTotal, 6)} denied submissions</p>
            </div>
          </div>
          <CustomerTypeColumns
            submissions={denied.slice(0, 6).map((s) => ({
              ...s,
              status: s.status as CisStatus,
            }))}
            hrefPrefix="support"
          />
        </section>
      )}

      {total === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <div className="rounded-full bg-zinc-100 p-4">
            <FileText className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-zinc-900">
            {q ? "No matching submissions" : "No submissions yet"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q ? "Try adjusting your search." : "Approved submissions will appear here."}
          </p>
        </div>
      )}
    </div>
  );
}
