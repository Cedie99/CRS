import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents } from "@/lib/db/schema";
import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardPagination, getPageNumber } from "@/components/dashboard-pagination";
import { CisCardGrid } from "@/components/cis-card-grid";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import { CUSTOMER_TYPE_DESCRIPTIONS, CUSTOMER_TYPE_LABELS, isDashboardCustomerType } from "@/lib/customer-types";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { CisStatus } from "@/components/status-badge";

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

export default async function LegalCustomerTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ customerType: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string; view?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { customerType } = await params;
  if (!isDashboardCustomerType(customerType)) notFound();

  const { q, status, page, view } = await searchParams;
  const isAllView = view === "all";
  const currentPage = getPageNumber(page);
  const pageSize = 18;
  const offset = (currentPage - 1) * pageSize;

  const history = await db
    .select({ cisId: workflowEvents.cisId })
    .from(workflowEvents)
    .where(
      and(
        eq(workflowEvents.actorId, session.user.id),
        inArray(workflowEvents.action, ["forwarded_to_approver", "denied"])
      )
    );
  const actedCisIds = [...new Set(history.map((e) => e.cisId))];

  const conditions = [
    isAllView
      ? inArray(cisSubmissions.status, ALL_VISIBLE_STATUSES)
      : actedCisIds.length > 0
        ? or(
            eq(cisSubmissions.status, "pending_legal_review"),
            inArray(cisSubmissions.id, actedCisIds)
          )!
        : eq(cisSubmissions.status, "pending_legal_review"),
    eq(cisSubmissions.customerType, customerType),
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

  const [submissions, countRow] = await Promise.all([
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
  ]);

  const total = Number(countRow[0]?.total ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href={isAllView ? "/legal?view=all" : "/legal"} className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" />
          Back to customer types
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
          {CUSTOMER_TYPE_LABELS[customerType]} Submissions
          {isAllView ? " (All Statuses)" : ""}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{CUSTOMER_TYPE_DESCRIPTIONS[customerType]}</p>
      </div>

      {isAllView && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Read-only context mode is active on detail pages opened from this list.
        </div>
      )}

      <DashboardFilters />

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No submissions found</h2>
          <p className="mt-1 text-sm text-zinc-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <CisCardGrid
            submissions={submissions.map((s) => ({ ...s, status: s.status as CisStatus }))}
            hrefPrefix="legal"
            readOnlyView={isAllView}
          />
          <DashboardPagination
            basePath={`/legal/customer-type/${customerType}`}
            currentPage={currentPage}
            totalItems={total}
            pageSize={pageSize}
            searchParams={{ q, status, view: isAllView ? "all" : undefined }}
          />
        </>
      )}
    </div>
  );
}
