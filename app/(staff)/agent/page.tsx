import Link from "next/link";
import { eq, desc, and, ilike, or, ne, count, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { CustomerTypeNavCards } from "@/components/customer-type-nav-cards";
import { getPageNumber } from "@/components/dashboard-pagination";
import { DashboardFilters } from "@/components/dashboard-filters";
import { buttonVariants } from "@/lib/button-variants";
import { Plus, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";

export const metadata = { title: "My Submissions — CRS" };

function isMissingArchivedColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === "42703" &&
    (maybeError.message ?? "").toLowerCase().includes("is_archived")
  );
}

export default async function AgentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; archived?: string; page?: string }>;
}) {
  const session = await auth();
  const { q, status, archived, page } = await searchParams;
  const currentPage = getPageNumber(page);
  const pageSize = 18;
  const offset = (currentPage - 1) * pageSize;
  const showArchived = archived === "1";

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
  type Submission = {
    id: string;
    tradeName: string | null;
    contactPerson: string | null;
    customerType: string | null;
    agentCode: string;
    status: string;
    createdAt: Date;
    updatedAt: Date | null;
  };

  let supportsArchived = true;
  let submissions: Submission[] = [];
  let filteredCount = 0;
  let statsCounts = { total: 0, active: 0, completed: 0, denied: 0 };
  let archivedCount = 0;

  try {
    const conditions = [
      eq(cisSubmissions.agentId, session!.user.id),
      showArchived ? eq(cisSubmissions.isArchived, true) : ne(cisSubmissions.isArchived, true),
    ];

    if (!showArchived) {
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
    }

    filteredCount = Number(
      (
        await db
          .select({ total: count() })
          .from(cisSubmissions)
          .where(and(...conditions))
      )[0]?.total ?? 0
    );

    submissions = await db
      .select(cardSelect)
      .from(cisSubmissions)
      .where(and(...conditions))
      .orderBy(desc(cisSubmissions.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [statsRow] = await db
      .select({
        total: count(),
        active: count(sql`CASE WHEN ${cisSubmissions.status} IN ('submitted','pending_endorsement','pending_legal_review','pending_finance_review','pending_approval','approved','pending_erp_encoding') THEN 1 END`),
        completed: count(sql`CASE WHEN ${cisSubmissions.status} = 'erp_encoded' THEN 1 END`),
        denied: count(sql`CASE WHEN ${cisSubmissions.status} IN ('denied','returned') THEN 1 END`),
      })
      .from(cisSubmissions)
      .where(and(eq(cisSubmissions.agentId, session!.user.id), ne(cisSubmissions.isArchived, true)));
    statsCounts = {
      total: Number(statsRow?.total ?? 0),
      active: Number(statsRow?.active ?? 0),
      completed: Number(statsRow?.completed ?? 0),
      denied: Number(statsRow?.denied ?? 0),
    };

    const [archivedRow] = await db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(eq(cisSubmissions.agentId, session!.user.id), eq(cisSubmissions.isArchived, true)));
    archivedCount = Number(archivedRow?.total ?? 0);
  } catch (error) {
    if (!isMissingArchivedColumnError(error)) {
      throw error;
    }

    supportsArchived = false;
    const fallbackConditions = [eq(cisSubmissions.agentId, session!.user.id)];
    if (q) {
      fallbackConditions.push(
        or(
          ilike(cisSubmissions.tradeName, `%${q}%`),
          ilike(cisSubmissions.contactPerson, `%${q}%`)
        )!
      );
    }
    if (status) {
      fallbackConditions.push(eq(cisSubmissions.status, status as CisStatus));
    }

    filteredCount = Number(
      (
        await db
          .select({ total: count() })
          .from(cisSubmissions)
          .where(and(...fallbackConditions))
      )[0]?.total ?? 0
    );

    submissions = await db
      .select(cardSelect)
      .from(cisSubmissions)
      .where(and(...fallbackConditions))
      .orderBy(desc(cisSubmissions.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [fallbackStatsRow] = await db
      .select({
        total: count(),
        active: count(sql`CASE WHEN ${cisSubmissions.status} IN ('submitted','pending_endorsement','pending_legal_review','pending_finance_review','pending_approval','approved','pending_erp_encoding') THEN 1 END`),
        completed: count(sql`CASE WHEN ${cisSubmissions.status} = 'erp_encoded' THEN 1 END`),
        denied: count(sql`CASE WHEN ${cisSubmissions.status} IN ('denied','returned') THEN 1 END`),
      })
      .from(cisSubmissions)
      .where(eq(cisSubmissions.agentId, session!.user.id));
    statsCounts = {
      total: Number(fallbackStatsRow?.total ?? 0),
      active: Number(fallbackStatsRow?.active ?? 0),
      completed: Number(fallbackStatsRow?.completed ?? 0),
      denied: Number(fallbackStatsRow?.denied ?? 0),
    };
  }

  const effectiveShowArchived = supportsArchived && showArchived;

  const { total, active, completed, denied } = statsCounts;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const stats = [
    {
      label: "Total",
      value: total,
      sub: total === 1 ? "1 submission" : `${total} submissions`,
      icon: FileText,
      iconBg: "bg-zinc-100",
      iconColor: "text-zinc-500",
      valueColor: "text-zinc-900",
      barColor: "bg-zinc-400",
      percent: 100,
    },
    {
      label: "In Progress",
      value: active,
      sub: total > 0 ? `${pct(active)}% of total` : "none yet",
      icon: Clock,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      valueColor: "text-blue-700",
      barColor: "bg-blue-400",
      percent: pct(active),
    },
    {
      label: "Onboarded",
      value: completed,
      sub: total > 0 ? `${pct(completed)}% of total` : "none yet",
      icon: CheckCircle,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      valueColor: "text-green-700",
      barColor: "bg-green-500",
      percent: pct(completed),
    },
    {
      label: "Not Accepted",
      value: denied,
      sub: total > 0 ? `${pct(denied)}% of total` : "none yet",
      icon: XCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      valueColor: "text-red-700",
      barColor: "bg-red-400",
      percent: pct(denied),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-zinc-900">My Submissions</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            View and track all customer forms you&apos;ve submitted.
            {session!.user.agentCode && (
              <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-500">
                {session!.user.agentCode}
              </span>
            )}
          </p>
        </div>
      </div>

      <DashboardFilters
        showArchivedToggle={supportsArchived}
        archivedCount={archivedCount}
      />

      {/* Stats — hidden in archived view */}
      {!effectiveShowArchived && <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, iconBg, iconColor, valueColor, barColor, percent }) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-xl border bg-white p-4 transition-all duration-200 hover:border-zinc-300 hover:shadow-sm sm:p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {label}
                </p>
                <p className={`mt-2 text-2xl font-bold tabular-nums sm:text-3xl ${valueColor}`}>
                  {value}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">{sub}</p>
              </div>
              <div className={`rounded-xl p-2 ${iconBg} sm:p-2.5`}>
                <Icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${iconColor}`} />
              </div>
            </div>
            {/* Colored fill bar at bottom showing proportion */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100">
              <div
                className={`h-full transition-all duration-700 ${barColor}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>}

      <CustomerTypeNavCards
        basePath="/agent"
        searchParams={{ q, status, archived }}
        submissions={submissions}
      />

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <div className="rounded-full bg-zinc-100 p-4">
            <FileText className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-zinc-900">
            {q || status ? "No matching submissions" : "No submissions yet"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q || status
              ? "Try adjusting your search or filters."
              : "Start by adding a new customer. A form link will be generated for them to fill out."}
          </p>
          {!q && !status && (
            <Link href="/agent/new" className={`mt-5 ${buttonVariants()}`}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add New Customer
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-white px-4 py-3 text-sm text-zinc-600">
          Select a customer type card to open its dedicated submissions page.
        </div>
      )}
    </div>
  );
}
