import { desc, and, ilike, or, count, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { CustomerTypeNavCards } from "@/components/customer-type-nav-cards";
import { getPageNumber } from "@/components/dashboard-pagination";
import { DashboardFilters } from "@/components/dashboard-filters";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Database, XCircle, Clock, LayoutList } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import { ActionRequiredSection } from "@/components/action-required-section";

export const metadata = { title: "Sales Support — CRS" };

const ALL_VISIBLE_STATUSES: CisStatus[] = [
  "draft",
  "submitted",
  "pending_endorsement",
  "pending_legal_review",
  "pending_finance_review",
  "pending_approval",
  "approved",
  "pending_erp_encoding",
  "erp_encoded",
  "denied",
  "returned",
];

export default async function SupportDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; view?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q, status, page, view } = await searchParams;
  const viewMode = view === "all" ? "all" : "queue";
  const isAllView = viewMode === "all";
  const currentPage = getPageNumber(page);
  const pageSize = 12;
  const offset = (currentPage - 1) * pageSize;
  // In queue mode fetch all actionable items; pagination only applies to the all-submissions view
  const queueLimit = isAllView ? pageSize : 2000;
  const queueOffset = isAllView ? offset : 0;

  const searchConditions: any[] = [];

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

  const pendingConditions = [
    isAllView
      ? inArray(cisSubmissions.status, ALL_VISIBLE_STATUSES as any)
      : eq(cisSubmissions.status, "approved"),
    ...searchConditions,
  ];
  const encodedConditions = [eq(cisSubmissions.status, "erp_encoded"), ...searchConditions];
  const deniedConditions = [eq(cisSubmissions.status, "denied"), ...searchConditions];

  const cardSelect = {
    id: cisSubmissions.id,
    tradeName: cisSubmissions.tradeName,
    contactPerson: cisSubmissions.contactPerson,
    customerType: cisSubmissions.customerType,
    agentCode: cisSubmissions.agentCode,
    customerCode: cisSubmissions.customerCode,
    status: cisSubmissions.status,
    createdAt: cisSubmissions.createdAt,
    updatedAt: cisSubmissions.updatedAt,
  };

  const [pendingEncoding, pendingCountRow, encoded, encodedCountRow, denied, deniedCountRow, typeCountRows] = await Promise.all([
    db
      .select(cardSelect)
      .from(cisSubmissions)
      .where(and(...pendingConditions))
      .orderBy(desc(cisSubmissions.updatedAt))
      .limit(queueLimit)
      .offset(queueOffset),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...pendingConditions)),
    db
      .select(cardSelect)
      .from(cisSubmissions)
      .where(and(...encodedConditions))
      .orderBy(desc(cisSubmissions.updatedAt))
      .limit(30),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...encodedConditions)),
    db
      .select(cardSelect)
      .from(cisSubmissions)
      .where(and(...deniedConditions))
      .orderBy(desc(cisSubmissions.updatedAt))
      .limit(30),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...deniedConditions)),
    db
      .select({ customerType: cisSubmissions.customerType, total: count() })
      .from(cisSubmissions)
      .where(and(...pendingConditions))
      .groupBy(cisSubmissions.customerType),
  ]);

  const pendingTotal = Number(pendingCountRow[0]?.total ?? 0);
  const encodedTotal = Number(encodedCountRow[0]?.total ?? 0);
  const deniedTotal = Number(deniedCountRow[0]?.total ?? 0);
  const total = isAllView ? pendingTotal : pendingTotal + encodedTotal + deniedTotal;
  const customerTypeCounts = Object.fromEntries(
    (typeCountRows as { customerType: string | null; total: number | string }[])
      .filter((r) => r.customerType)
      .map((r) => [r.customerType!, Number(r.total)])
  );
  const buildModeHref = (mode: "queue" | "all") => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (mode === "all") params.set("view", "all");
    const suffix = params.toString();
    return `/support${suffix ? `?${suffix}` : ""}`;
  };

  const stats = [
    {
      label: isAllView ? "Visible Forms" : "Ready to Onboard",
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
          {isAllView
            ? "Browse all submissions in read-only mode."
            : "Enter approved customers into the system and review denied forms."}
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
        <Link
          href={buildModeHref("queue")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!isAllView ? "bg-emerald-100 text-emerald-800" : "text-zinc-600 hover:text-zinc-900"}`}
        >
          My Queue
        </Link>
        <Link
          href={buildModeHref("all")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isAllView ? "bg-blue-100 text-blue-800" : "text-zinc-600 hover:text-zinc-900"}`}
        >
          All Submissions (Read-only)
        </Link>
      </div>

      {isAllView && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Context mode: you can view all submissions across customer types and statuses. Actions are disabled when opened from this mode.
        </div>
      )}

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

      {!isAllView && (
        <ActionRequiredSection
          submissions={pendingEncoding.map((s) => ({ ...s, status: s.status as CisStatus }))}
          totalCount={pendingTotal}
          hrefPrefix="support"
          label="Ready to Onboard"
          sublabel="These customers have been approved and are waiting to be encoded into ERP."
          accentClass="border-emerald-300 bg-emerald-50/60"
          badgeClass="bg-emerald-100 text-emerald-800"
        />
      )}

      <CustomerTypeNavCards
        basePath="/support"
        searchParams={{ q, status, view: isAllView ? "all" : undefined }}
        submissions={isAllView ? pendingEncoding : [...pendingEncoding, ...encoded, ...denied]}
        customerTypeCounts={customerTypeCounts}
      />

      {total === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">
            {q || status ? "No matching submissions" : "No submissions yet"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q || status ? "Try adjusting your search or filters." : isAllView ? "No submissions match this context view." : "Approved submissions will appear here."}
          </p>
        </div>
      )}

      {total > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          {isAllView ? (
            <span>You are in read-only mode — select a card to browse, but actions are disabled.</span>
          ) : (
            <span><strong className="text-zinc-800">Highlighted cards</strong> have submissions to process. Select one to open it.</span>
          )}
        </div>
      )}
    </div>
  );
}
