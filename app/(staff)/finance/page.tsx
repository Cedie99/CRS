import { eq, desc, and, ilike, or, inArray, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents } from "@/lib/db/schema";
import { CustomerTypeNavCards } from "@/components/customer-type-nav-cards";
import { getPageNumber } from "@/components/dashboard-pagination";
import { DashboardFilters } from "@/components/dashboard-filters";
import { redirect } from "next/navigation";
import { FileText, DollarSign, Clock3 } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";

export const metadata = { title: "Finance Review Queue — CRS" };

export default async function FinanceDashboard({
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

  const conditions: any[] = [eq(cisSubmissions.status, "pending_finance_review")];

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
            <span>{filteredCount} Pending Review</span>
          </span>
        )}
      </div>

      <DashboardFilters />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">In Queue</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl">{filteredCount}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">awaiting review</p>
          <div className="mt-3 h-1 w-full rounded-full bg-zinc-100">
            <div className="h-1 rounded-full bg-amber-400" style={{ width: "100%" }} />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Forwarded</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl">{forwarded}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">{total > 0 ? `${pct(forwarded)}% of processed` : "none yet"}</p>
          <div className="mt-3 h-1 w-full rounded-full bg-zinc-100">
            <div className="h-1 rounded-full bg-green-500" style={{ width: `${pct(forwarded)}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Denied</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl">{denied}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">{total > 0 ? `${pct(denied)}% of processed` : "none yet"}</p>
          <div className="mt-3 h-1 w-full rounded-full bg-zinc-100">
            <div className="h-1 rounded-full bg-red-400" style={{ width: `${pct(denied)}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Total Processed</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl">{total}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">all time</p>
          <div className="mt-3 h-1 w-full rounded-full bg-zinc-100">
            <div className="h-1 rounded-full bg-zinc-400" style={{ width: total > 0 ? "100%" : "0%" }} />
          </div>
        </div>
      </div>

      <CustomerTypeNavCards
        basePath="/finance"
        searchParams={{ q, status }}
        submissions={submissions}
      />

      {filteredCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <div className="rounded-full bg-zinc-100 p-4">
            <FileText className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-zinc-900">
            {q || status ? "No matching submissions" : "Queue is clear"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q || status ? "Try adjusting your search or filters." : "No submissions awaiting finance review."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white px-4 py-3 text-sm text-zinc-600">
          Select a customer type card to open its dedicated submissions page.
        </div>
      )}
    </div>
  );
}
