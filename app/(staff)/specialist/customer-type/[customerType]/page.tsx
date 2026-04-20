import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardPagination, getPageNumber } from "@/components/dashboard-pagination";
import { CisCardGrid } from "@/components/cis-card-grid";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import { CUSTOMER_TYPE_DESCRIPTIONS, CUSTOMER_TYPE_LABELS, isDashboardCustomerType } from "@/lib/customer-types";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { CisStatus } from "@/components/status-badge";

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

export default async function SpecialistCustomerTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ customerType: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { customerType } = await params;
  if (!isDashboardCustomerType(customerType)) notFound();

  const { q, page } = await searchParams;
  const currentPage = getPageNumber(page);
  const pageSize = 12;
  const offset = (currentPage - 1) * pageSize;

  const conditions: any[] = [
    eq(cisSubmissions.status, "pending_erp_encoding"),
    eq(cisSubmissions.customerType, customerType),
  ];

  if (q) {
    conditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )
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
        <Link href="/specialist" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" />
          Back to customer types
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{CUSTOMER_TYPE_LABELS[customerType]} Submissions</h1>
        <p className="mt-1 text-sm text-zinc-500">{CUSTOMER_TYPE_DESCRIPTIONS[customerType]}</p>
      </div>

      <DashboardFilters />

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No submissions found</h2>
          <p className="mt-1 text-sm text-zinc-500">Try adjusting your search.</p>
        </div>
      ) : (
        <>
          <CisCardGrid
            submissions={submissions.map((s) => ({ ...s, status: s.status as CisStatus }))}
            hrefPrefix="specialist"
          />
          <DashboardPagination
            basePath={`/specialist/customer-type/${customerType}`}
            currentPage={currentPage}
            totalItems={total}
            pageSize={pageSize}
            searchParams={{ q }}
          />
        </>
      )}
    </div>
  );
}
