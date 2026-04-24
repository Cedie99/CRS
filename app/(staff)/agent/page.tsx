import Link from "next/link";
import { eq, desc, and, ilike, or, ne, count, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { getAgentStats } from "@/lib/cached-queries";
import { CustomerTypeNavCards } from "@/components/customer-type-nav-cards";
import { getPageNumber } from "@/components/dashboard-pagination";
import { DashboardFilters } from "@/components/dashboard-filters";
import { buttonVariants } from "@/lib/button-variants";
import { Plus, FileText, Link as LinkIcon, UserRound, ChevronRight } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";
import { EmptyStateLogo } from "@/components/empty-state-logo";

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
  let statsCounts = { total: 0, draft: 0, awaitingAgentCompletion: 0, active: 0, completed: 0, denied: 0 };
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

    // Run all queries in parallel — cached stats (10s) + fresh list data
    const [filteredCountRow, submissionRows, cachedStats, archivedRows] = await Promise.all([
      db
        .select({ total: count() })
        .from(cisSubmissions)
        .where(and(...conditions)),
      db
        .select(cardSelect)
        .from(cisSubmissions)
        .where(and(...conditions))
        .orderBy(desc(cisSubmissions.createdAt))
        .limit(pageSize)
        .offset(offset),
      getAgentStats(session!.user.id),
      db
        .select({ total: count() })
        .from(cisSubmissions)
        .where(and(eq(cisSubmissions.agentId, session!.user.id), eq(cisSubmissions.isArchived, true))),
    ]);

    filteredCount = Number(filteredCountRow[0]?.total ?? 0);
    submissions = submissionRows;
    statsCounts = cachedStats;
    archivedCount = Number(archivedRows[0]?.total ?? 0);
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

    const [fbCountRow, fbSubmissions, cachedStats] = await Promise.all([
      db
        .select({ total: count() })
        .from(cisSubmissions)
        .where(and(...fallbackConditions)),
      db
        .select(cardSelect)
        .from(cisSubmissions)
        .where(and(...fallbackConditions))
        .orderBy(desc(cisSubmissions.createdAt))
        .limit(pageSize)
        .offset(offset),
      getAgentStats(session!.user.id),
    ]);

    filteredCount = Number(fbCountRow[0]?.total ?? 0);
    submissions = fbSubmissions;
    statsCounts = cachedStats;
  }

  const effectiveShowArchived = supportsArchived && showArchived;

  const { total, draft, awaitingAgentCompletion, active, completed, denied } = statsCounts;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const openPipeline = draft + awaitingAgentCompletion + active;

  const queueCards = [
    {
      label: "Awaiting Customer",
      value: draft,
      sub: draft === 1 ? "1 link sent" : `${draft} links sent`,
      href: "/agent/drafts",
      icon: LinkIcon,
      tone: "border-amber-200 bg-amber-50/40 text-amber-700",
      iconTone: "bg-amber-100 text-amber-600",
    },
    {
      label: "Awaiting Agent Completion",
      value: awaitingAgentCompletion,
      sub: awaitingAgentCompletion === 1 ? "1 customer submitted" : `${awaitingAgentCompletion} customer submissions`,
      href: "/agent/agent-completion",
      icon: UserRound,
      tone: "border-blue-200 bg-blue-50/40 text-blue-700",
      iconTone: "bg-blue-100 text-blue-600",
    },
  ];

  const overviewTiles = [
    {
      label: "Open Pipeline",
      value: openPipeline,
      sub: total > 0 ? `${pct(openPipeline)}% of total` : "none yet",
    },
    {
      label: "Onboarded",
      value: completed,
      sub: total > 0 ? `${pct(completed)}% of total` : "none yet",
    },
    {
      label: "Not Accepted",
      value: denied,
      sub: total > 0 ? `${pct(denied)}% of total` : "none yet",
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
      {!effectiveShowArchived && <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700">Performance Snapshot</h2>
        </div>
        <div className="space-y-3 border-t border-zinc-100 p-3">
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total Submissions</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200">{total}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {queueCards.map(({ label, value, sub, href, icon: Icon, tone, iconTone }) => (
              <Link
                key={label}
                href={href}
                className={`group rounded-lg border p-3 transition-all duration-200 hover:shadow-sm ${tone}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
                    <p className="mt-1 text-3xl font-bold leading-none">{value}</p>
                    <p className="mt-1.5 text-xs text-zinc-500">{sub}</p>
                  </div>
                  <span className={`rounded-lg p-2 ${iconTone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold">
                  Open queue
                  <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {overviewTiles.map(({ label, value, sub }) => (
              <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
                <p className="mt-1.5 text-xl font-bold text-zinc-900">{value}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>}

      <CustomerTypeNavCards
        basePath="/agent"
        searchParams={{ q, status, archived }}
        submissions={submissions}
      />

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
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
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <strong className="text-zinc-800">Highlighted cards</strong> have submissions. Select one to open its list.
        </div>
      )}
    </div>
  );
}
