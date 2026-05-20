import { and, count, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardPagination, getPageNumber } from "@/components/dashboard-pagination";
import { CisCardGrid } from "@/components/cis-card-grid";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import { CUSTOMER_TYPE_DESCRIPTIONS, CUSTOMER_TYPE_LABELS, isDashboardCustomerType } from "@/lib/customer-types";
import { notFound, redirect } from "next/navigation";
import type { CisStatus } from "@/components/status-badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

const SUBMISSION_COLS = {
  id: cisSubmissions.id,
  tradeName: cisSubmissions.tradeName,
  contactPerson: cisSubmissions.contactPerson,
  customerType: cisSubmissions.customerType,
  agentCode: cisSubmissions.agentCode,
  agentId: cisSubmissions.agentId,
  customerCode: cisSubmissions.customerCode,
  status: cisSubmissions.status,
  createdAt: cisSubmissions.createdAt,
  updatedAt: cisSubmissions.updatedAt,
  agentName: users.fullName,
};

export default async function ManagerCustomerTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ customerType: string }>;
  searchParams: Promise<{ q?: string; status?: string; agentId?: string; queuePage?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { customerType } = await params;
  if (!isDashboardCustomerType(customerType)) notFound();

  const { q, status, agentId, queuePage } = await searchParams;
  const currentPage = getPageNumber(queuePage);
  const pageSize = 12;
  const offset = (currentPage - 1) * pageSize;

  const isTopManager = (session.user as any).isTopManager === true;
  const myAgents = await db
    .select({ id: users.id })
    .from(users)
    .where(
      isTopManager
        ? and(eq(users.isActive, true), sql`${users.role} IN ('sales_agent', 'rsr')`)
        : eq(users.managerId, session.user.id)
    );
  const agentIds = myAgents.map((a) => a.id);

  if (agentIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
        <EmptyStateLogo />
        <h2 className="mt-4 text-base font-semibold text-zinc-900">No agents assigned</h2>
        <p className="mt-1 text-sm text-zinc-500">No agents are assigned to you yet.</p>
      </div>
    );
  }

  const conditions: any[] = [
    inArray(cisSubmissions.agentId, agentIds),
    ne(cisSubmissions.status, "draft"),
    eq(cisSubmissions.customerType, customerType),
  ];

  if (agentId) conditions.push(eq(cisSubmissions.agentId, agentId));
  if (status) conditions.push(eq(cisSubmissions.status, status as CisStatus));
  if (q) {
    conditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )!
    );
  }

  const [submissions, countRow] = await Promise.all([
    db
      .select(SUBMISSION_COLS)
      .from(cisSubmissions)
      .innerJoin(users, eq(cisSubmissions.agentId, users.id))
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
        <Breadcrumbs
          items={[
            { label: "Team Submissions", href: "/manager" },
            { label: `${CUSTOMER_TYPE_LABELS[customerType]} Submissions` },
          ]}
          className="mb-2"
        />
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{CUSTOMER_TYPE_LABELS[customerType]} Submissions</h1>
        <p className="mt-1 text-sm text-zinc-500">{CUSTOMER_TYPE_DESCRIPTIONS[customerType]}</p>
      </div>

      <DashboardFilters showStatusFilter />

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
            hrefPrefix="manager"
          />
          <DashboardPagination
            basePath={`/manager/customer-type/${customerType}`}
            currentPage={currentPage}
            totalItems={total}
            pageSize={pageSize}
            pageParamName="queuePage"
            searchParams={{ q, status, agentId }}
          />
        </>
      )}
    </div>
  );
}
