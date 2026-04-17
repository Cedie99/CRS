import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardPagination, getPageNumber } from "@/components/dashboard-pagination";
import { CisCardGrid } from "@/components/cis-card-grid";
import { CUSTOMER_TYPE_DESCRIPTIONS, CUSTOMER_TYPE_LABELS, isDashboardCustomerType } from "@/lib/customer-types";
import { ArrowLeft, FileText } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { CisStatus } from "@/components/status-badge";

export default async function FinanceCustomerTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ customerType: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { customerType } = await params;
  if (!isDashboardCustomerType(customerType)) notFound();

  const { q, status, page } = await searchParams;
  const currentPage = getPageNumber(page);
  const pageSize = 18;
  const offset = (currentPage - 1) * pageSize;

  const conditions: any[] = [
    eq(cisSubmissions.status, "pending_finance_review"),
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
        <Link href="/finance" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" />
          Back to customer types
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{CUSTOMER_TYPE_LABELS[customerType]} Submissions</h1>
        <p className="mt-1 text-sm text-zinc-500">{CUSTOMER_TYPE_DESCRIPTIONS[customerType]}</p>
      </div>

      <DashboardFilters />

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <div className="rounded-full bg-zinc-100 p-4">
            <FileText className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No submissions found</h2>
          <p className="mt-1 text-sm text-zinc-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <CisCardGrid
            submissions={submissions.map((s) => ({ ...s, status: s.status as CisStatus }))}
            hrefPrefix="finance"
          />
          <DashboardPagination
            basePath={`/finance/customer-type/${customerType}`}
            currentPage={currentPage}
            totalItems={total}
            pageSize={pageSize}
            searchParams={{ q, status }}
          />
        </>
      )}
    </div>
  );
}
