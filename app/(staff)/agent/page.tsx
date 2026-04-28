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
import { Plus, FileText, Link as LinkIcon, ChevronRight } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import { ActionRequiredSection } from "@/components/action-required-section";

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
  let agentCompletionRows: Submission[] = [];
  let agentCompletionTotal = 0;

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
    const [filteredCountRow, submissionRows, cachedStats, archivedRows, acRows, acCountRow] = await Promise.all([
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
      showArchived
        ? Promise.resolve([])
        : db
            .select(cardSelect)
            .from(cisSubmissions)
            .where(and(eq(cisSubmissions.agentId, session!.user.id), eq(cisSubmissions.status, "submitted")))
            .orderBy(desc(cisSubmissions.createdAt))
            .limit(6),
      showArchived
        ? Promise.resolve([{ total: 0 }])
        : db
            .select({ total: count() })
            .from(cisSubmissions)
            .where(and(eq(cisSubmissions.agentId, session!.user.id), eq(cisSubmissions.status, "submitted"))),
    ]);

    filteredCount = Number(filteredCountRow[0]?.total ?? 0);
    submissions = submissionRows;
    statsCounts = cachedStats;
    archivedCount = Number(archivedRows[0]?.total ?? 0);
    agentCompletionRows = acRows as Submission[];
    agentCompletionTotal = Number((acCountRow as { total: number | string }[])[0]?.total ?? 0);
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
      label: "Drafts",
      value: draft,
      sub: draft === 1 ? "1 link sent" : `${draft} links sent`,
      href: "/agent/drafts",
      icon: LinkIcon,
      tone: "border-amber-200 bg-amber-50/40 text-amber-700",
      iconTone: "bg-amber-100 text-amber-600",
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
      {!effectiveShowArchived && (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-700">Performance Snapshot</h2>
            <span className="text-xs text-zinc-400">{total} total</span>
          </div>

          <div className="grid grid-cols-2 gap-px border-t border-zinc-100 bg-zinc-100 sm:grid-cols-4">
            {/* Drafts — actionable tile */}
            <Link
              href="/agent/drafts"
              className="group col-span-2 flex items-center justify-between gap-4 bg-amber-50 p-4 transition-colors hover:bg-amber-100/60 sm:col-span-1"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Drafts</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-amber-700">{draft}</p>
                <p className="mt-1 text-xs text-amber-600/70">{draft === 1 ? "1 link sent" : `${draft} links sent`}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="rounded-lg bg-amber-100 p-2 text-amber-600 ring-1 ring-amber-200">
                  <LinkIcon className="h-4 w-4" />
                </span>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600 opacity-0 transition-opacity group-hover:opacity-100">
                  View <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </Link>

            {/* Overview tiles */}
            {overviewTiles.map(({ label, value, sub }) => (
              <div key={label} className="flex flex-col justify-between bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
                <div>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">{value}</p>
                  <p className="mt-1 text-xs text-zinc-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!effectiveShowArchived && (
        <ActionRequiredSection
          submissions={agentCompletionRows.map((s) => ({ ...s, status: s.status as CisStatus }))}
          totalCount={agentCompletionTotal}
          hrefPrefix="agent"
          label="Forms You Need to Fill Up"
          sublabel="Your customers have submitted their forms. Complete your section to move these forward."
          accentClass="border-blue-300 bg-blue-50/60"
          badgeClass="bg-blue-100 text-blue-800"
        />
      )}

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
