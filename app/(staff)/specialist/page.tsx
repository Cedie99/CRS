import { desc, and, ilike, or, count, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { CustomerTypeNavCards } from "@/components/customer-type-nav-cards";
import { getPageNumber } from "@/components/dashboard-pagination";
import { DashboardFilters } from "@/components/dashboard-filters";
import { redirect } from "next/navigation";
import { Database, CheckCircle, XCircle, Clock, LayoutList } from "lucide-react";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import type { CisStatus } from "@/components/status-badge";
import { ActionRequiredSection } from "@/components/action-required-section";

export const metadata = { title: "Project Development - CRS" };

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

export default async function SpecialistDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q, status, page } = await searchParams;
  const currentPage = getPageNumber(page);
  const pageSize = 18;
  const offset = (currentPage - 1) * pageSize;

  const searchConditions = [];

  if (q) {
    searchConditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )!
    );
  }

  if (status) {
    searchConditions.push(eq(cisSubmissions.status, status as CisStatus));
  }

  const pendingConditions = [eq(cisSubmissions.status, "pending_erp_encoding"), ...searchConditions];
  const encodedConditions = [eq(cisSubmissions.status, "erp_encoded"), ...searchConditions];
  const closedConditions = [
    inArray(cisSubmissions.status, ["denied", "returned"] as CisStatus[]),
    ...searchConditions,
  ];

  const [rows, pendingCountRow, encodedCountRow, closedCountRow, pendingCarouselRows, typeCountRows] = await Promise.all([
    db
      .select(SUBMISSION_COLS)
      .from(cisSubmissions)
      .innerJoin(users, eq(cisSubmissions.agentId, users.id))
      .where(and(...pendingConditions))
      .orderBy(desc(cisSubmissions.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...pendingConditions)),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...encodedConditions)),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...closedConditions)),
    db
      .select(SUBMISSION_COLS)
      .from(cisSubmissions)
      .innerJoin(users, eq(cisSubmissions.agentId, users.id))
      .where(and(...pendingConditions))
      .orderBy(desc(cisSubmissions.createdAt)),
    db
      .select({ customerType: cisSubmissions.customerType, total: count() })
      .from(cisSubmissions)
      .where(and(...pendingConditions))
      .groupBy(cisSubmissions.customerType),
  ]);

  const pendingTotal = Number(pendingCountRow[0]?.total ?? 0);
  const encodedTotal = Number(encodedCountRow[0]?.total ?? 0);
  const closedTotal = Number(closedCountRow[0]?.total ?? 0);
  const total = pendingTotal + encodedTotal + closedTotal;

  const customerTypeCounts = Object.fromEntries(
    (typeCountRows as { customerType: string | null; total: number | string }[])
      .filter((r) => r.customerType)
      .map((r) => [r.customerType!, Number(r.total)])
  );

  const stats = [
    {
      label: "Ready to Encode",
      value: pendingTotal,
      icon: Clock,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      label: "Onboarded",
      value: encodedTotal,
      icon: CheckCircle,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Denied / Returned",
      value: closedTotal,
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5">
            <Database className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">ERP Encoding Queue</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Approved accounts pending ERP encoding.</p>
          </div>
        </div>
        {pendingTotal > 0 && (
          <span className="mt-7 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-200 bg-linear-to-r from-indigo-50 to-indigo-100/80 px-3.5 py-1.5 text-sm font-semibold text-indigo-800 shadow-sm sm:mt-8">
            <Clock className="h-3.5 w-3.5 text-indigo-700" />
            <span>{pendingTotal} Pending ERP</span>
          </span>
        )}
      </div>

      <DashboardFilters />

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

      <ActionRequiredSection
        submissions={(pendingCarouselRows as typeof rows).map((r) => ({ ...r, status: r.status as CisStatus }))}
        totalCount={pendingTotal}
        hrefPrefix="specialist"
        label="Forms You Need to Encode to ERP"
        sublabel="These accounts have been approved and are waiting to be encoded into the ERP system."
        accentClass="border-indigo-300 bg-indigo-50/60"
        badgeClass="bg-indigo-100 text-indigo-800"
      />

      <CustomerTypeNavCards
        basePath="/specialist"
        searchParams={{ q, status }}
        submissions={rows}
        customerTypeCounts={customerTypeCounts}
      />

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">
            {q || status ? "No matching submissions" : "Queue is clear"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q || status ? "Try adjusting your search or filters." : "No accounts waiting for ERP encoding."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <span><strong className="text-zinc-800">Highlighted cards</strong> have submissions to encode. Select one to open it.</span>
        </div>
      )}
    </div>
  );
}
