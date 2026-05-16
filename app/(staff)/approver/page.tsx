import { eq, desc, and, ilike, or, inArray, count, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { getUserWorkflowHistory } from "@/lib/cached-queries";
import { CustomerTypeNavCards } from "@/components/customer-type-nav-cards";
import { getPageNumber } from "@/components/dashboard-pagination";
import { DashboardFilters } from "@/components/dashboard-filters";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Clock3 } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import { ActionRequiredSection } from "@/components/action-required-section";

export const metadata = { title: "Approval Queue — CRS" };

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

export default async function ApproverDashboard({
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
  const pageSize = 18;
  const offset = (currentPage - 1) * pageSize;

  const cardSelect = {
    id: cisSubmissions.id,
    tradeName: cisSubmissions.tradeName,
    contactPerson: cisSubmissions.contactPerson,
    customerType: cisSubmissions.customerType,
    agentCode: cisSubmissions.agentCode,
    status: cisSubmissions.status,
    createdAt: cisSubmissions.createdAt,
    updatedAt: cisSubmissions.updatedAt,
  };

  const history = await getUserWorkflowHistory(session.user.id, ["approved", "denied"]);
  const conditions = [
    isAllView
      ? inArray(cisSubmissions.status, ALL_VISIBLE_STATUSES)
      : eq(cisSubmissions.status, "pending_approval"),
  ];

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

  const [submissions, filteredCountRow, actionRows, actionCountRow, typeCountRows] = await Promise.all([
    db
      .select(cardSelect)
      .from(cisSubmissions)
      .where(and(...conditions))
      .orderBy(desc(cisSubmissions.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...conditions)),
    isAllView
      ? Promise.resolve([])
      : db
          .select(cardSelect)
          .from(cisSubmissions)
          .where(eq(cisSubmissions.status, "pending_approval"))
          .orderBy(desc(cisSubmissions.createdAt))
          .limit(30),
    isAllView
      ? Promise.resolve([{ total: 0 }])
      : db
          .select({ total: count() })
          .from(cisSubmissions)
          .where(eq(cisSubmissions.status, "pending_approval")),
    db
      .select({ customerType: cisSubmissions.customerType, total: count() })
      .from(cisSubmissions)
      .where(and(...conditions))
      .groupBy(cisSubmissions.customerType),
  ]);
  const filteredCount = Number(filteredCountRow[0]?.total ?? 0);
  const actionTotal = Number((actionCountRow as { total: number | string }[])[0]?.total ?? 0);
  const customerTypeCounts = Object.fromEntries(
    (typeCountRows as { customerType: string | null; total: number | string }[])
      .filter((r) => r.customerType)
      .map((r) => [r.customerType!, Number(r.total)])
  );

  const approved = history.filter((e) => e.action === "approved").length;
  const denied = history.filter((e) => e.action === "denied").length;
  const total = approved + denied;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const buildModeHref = (mode: "queue" | "all") => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (mode === "all") params.set("view", "all");
    const suffix = params.toString();
    return `/approver${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-50 p-2.5">
            <BadgeCheck className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Approval Queue</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              These submissions have passed Finance review and are awaiting your final decision.
            </p>
          </div>
        </div>
        {filteredCount > 0 && (
          <span className="mt-7 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-orange-200 bg-linear-to-r from-orange-50 to-orange-100/80 px-3.5 py-1.5 text-sm font-semibold text-orange-800 shadow-sm sm:mt-8">
            <Clock3 className="h-3.5 w-3.5 text-orange-700" />
            <span>{filteredCount} {isAllView ? "Visible Forms" : "Pending Review"}</span>
          </span>
        )}
      </div>

      <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
        <Link
          href={buildModeHref("queue")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!isAllView ? "bg-orange-100 text-orange-800" : "text-zinc-600 hover:text-zinc-900"}`}
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
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{isAllView ? "Visible Forms" : "In Queue"}</p>
            <p className="mt-1.5 text-xl font-bold text-zinc-900">{filteredCount}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{isAllView ? "matching filters" : "awaiting decision"}</p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Approved</p>
            <p className="mt-1.5 text-xl font-bold text-zinc-900">{approved}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{total > 0 ? `${pct(approved)}% of processed` : "none yet"}</p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Denied</p>
            <p className="mt-1.5 text-xl font-bold text-zinc-900">{denied}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{total > 0 ? `${pct(denied)}% of processed` : "none yet"}</p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Total Processed</p>
            <p className="mt-1.5 text-xl font-bold text-zinc-900">{total}</p>
            <p className="mt-1 text-[11px] text-zinc-500">all time</p>
          </div>
        </div>
      </div>

      {!isAllView && (
        <ActionRequiredSection
          submissions={(actionRows as typeof submissions).map((s) => ({ ...s, status: s.status as CisStatus }))}
          totalCount={actionTotal}
          hrefPrefix="approver"
          label="Forms You Need to Approve"
          sublabel="These submissions have cleared Finance review and are waiting for your final decision."
          accentClass="border-orange-300 bg-orange-50/60"
          badgeClass="bg-orange-100 text-orange-800"
        />
      )}

      <CustomerTypeNavCards
        basePath="/approver"
        searchParams={{ q, status, view: isAllView ? "all" : undefined }}
        submissions={submissions}
        customerTypeCounts={customerTypeCounts}
      />

      {filteredCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">
            {q || status ? "No matching submissions" : isAllView ? "No submissions available" : "Queue is clear"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q || status ? "Try adjusting your search or filters." : isAllView ? "No submissions match this context view." : "No submissions awaiting approval."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          {isAllView ? (
            <span>You are in read-only mode — select a card to browse, but actions are disabled.</span>
          ) : (
            <span>
              <strong className="text-zinc-800">Highlighted cards</strong> have submissions awaiting your approval. Select one to open it.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
