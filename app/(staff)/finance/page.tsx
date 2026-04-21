import { eq, desc, and, ilike, or, inArray, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents } from "@/lib/db/schema";
import { CustomerTypeNavCards } from "@/components/customer-type-nav-cards";
import { getPageNumber } from "@/components/dashboard-pagination";
import { DashboardFilters } from "@/components/dashboard-filters";
import { AnimatedDisclosure } from "@/components/animated-disclosure";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, DollarSign, Clock3 } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";
import { EmptyStateLogo } from "@/components/empty-state-logo";

export const metadata = { title: "Finance Review Queue — CRS" };

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

export default async function FinanceDashboard({
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

  const conditions: any[] = [
    isAllView
      ? inArray(cisSubmissions.status, ALL_VISIBLE_STATUSES as any)
      : eq(cisSubmissions.status, "pending_finance_review"),
  ];

  if (q) {
    conditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )
    );
  }

  if (status) {
    conditions.push(eq(cisSubmissions.status, status as CisStatus));
  }

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

  const [submissions, filteredCountRow, history] = await Promise.all([
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
    db
      .select({ action: workflowEvents.action })
      .from(workflowEvents)
      .where(
        and(
          eq(workflowEvents.actorId, session.user.id),
          inArray(workflowEvents.action, ["forwarded_to_approver", "denied"])
        )
      ),
  ]);
  const filteredCount = Number(filteredCountRow[0]?.total ?? 0);

  const forwarded = history.filter((e) => e.action === "forwarded_to_approver").length;
  const denied = history.filter((e) => e.action === "denied").length;
  const total = forwarded + denied;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const buildModeHref = (mode: "queue" | "all") => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (mode === "all") params.set("view", "all");
    const suffix = params.toString();
    return `/finance${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 p-2.5">
            <DollarSign className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">Finance Review Queue</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Review these submissions and forward them to the Senior Approver when ready.
            </p>
          </div>
        </div>
        {filteredCount > 0 && (
          <span className="mt-7 inline-flex self-start shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-linear-to-r from-amber-50 to-amber-100/80 px-3.5 py-1.5 text-sm font-semibold text-amber-800 shadow-sm sm:mt-8 sm:self-auto">
            <Clock3 className="h-3.5 w-3.5 text-amber-700" />
            <span>{filteredCount} {isAllView ? "Visible Forms" : "Pending Review"}</span>
          </span>
        )}
      </div>

      <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
        <Link
          href={buildModeHref("queue")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!isAllView ? "bg-amber-100 text-amber-800" : "text-zinc-600 hover:text-zinc-900"}`}
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

      <AnimatedDisclosure title="Performance Snapshot" className="rounded-xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 p-3 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{isAllView ? "Visible Forms" : "In Queue"}</p>
            <p className="mt-1.5 text-xl font-bold text-zinc-900">{filteredCount}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{isAllView ? "matching filters" : "awaiting review"}</p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Forwarded</p>
            <p className="mt-1.5 text-xl font-bold text-zinc-900">{forwarded}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{total > 0 ? `${pct(forwarded)}% of processed` : "none yet"}</p>
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
      </AnimatedDisclosure>

      <CustomerTypeNavCards
        basePath="/finance"
        searchParams={{ q, status, view: isAllView ? "all" : undefined }}
        submissions={submissions}
      />

      {filteredCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">
            {q || status ? "No matching submissions" : isAllView ? "No submissions available" : "Queue is clear"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q || status ? "Try adjusting your search or filters." : isAllView ? "No submissions match this context view." : "No submissions are awaiting finance review right now."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          {isAllView ? (
            <span>You are in read-only mode — select a card to browse, but actions are disabled.</span>
          ) : (
            <span>
              <strong className="text-zinc-800">Highlighted cards</strong> have submissions waiting for your review. Select one to open it.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
