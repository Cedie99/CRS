import Link from "next/link";
import { and, count, desc, eq, ilike, ne, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardPagination, getPageNumber } from "@/components/dashboard-pagination";
import { CisCardGrid } from "@/components/cis-card-grid";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import { CUSTOMER_TYPE_DESCRIPTIONS, CUSTOMER_TYPE_LABELS, isDashboardCustomerType } from "@/lib/customer-types";
import { buttonVariants } from "@/lib/button-variants";
import { ArrowLeft, Plus } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { CisStatus } from "@/components/status-badge";

function isMissingArchivedColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const check = (e: unknown): boolean => {
    if (!e || typeof e !== "object") return false;
    const maybeError = e as { code?: string; message?: string; cause?: unknown };
    if (
      maybeError.code === "42703" &&
      (maybeError.message ?? "").toLowerCase().includes("is_archived")
    ) return true;
    return check(maybeError.cause);
  };
  return check(error);
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

export default async function AgentCustomerTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ customerType: string }>;
  searchParams: Promise<{ q?: string; status?: string; archived?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { customerType } = await params;
  if (!isDashboardCustomerType(customerType)) notFound();

  const { q, status, archived, page } = await searchParams;
  const showArchived = archived === "1";
  const currentPage = getPageNumber(page);
  const pageSize = 18;
  const offset = (currentPage - 1) * pageSize;

  let supportsArchived = true;
  let submissions: Array<{
    id: string;
    tradeName: string | null;
    contactPerson: string | null;
    customerType: string | null;
    agentCode: string;
    status: string;
    createdAt: Date;
    updatedAt: Date | null;
  }> = [];
  let total = 0;
  let archivedCount = 0;

  try {
    const conditions = [
      eq(cisSubmissions.agentId, session.user.id),
      eq(cisSubmissions.customerType, customerType),
      ne(cisSubmissions.status, "draft"),
      ne(cisSubmissions.status, "submitted"),
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

    const [rows, countRow, archivedRow] = await Promise.all([
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
        .select({ total: count() })
        .from(cisSubmissions)
        .where(and(eq(cisSubmissions.agentId, session.user.id), eq(cisSubmissions.isArchived, true))),
    ]);

    submissions = rows;
    total = Number(countRow[0]?.total ?? 0);
    archivedCount = Number(archivedRow[0]?.total ?? 0);
  } catch (error) {
    if (!isMissingArchivedColumnError(error)) {
      throw error;
    }

    supportsArchived = false;
    const fallbackConditions = [
      eq(cisSubmissions.agentId, session.user.id),
      eq(cisSubmissions.customerType, customerType),
      ne(cisSubmissions.status, "draft"),
      ne(cisSubmissions.status, "submitted"),
    ];

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

    const [rows, countRow] = await Promise.all([
      db
        .select(cardSelect)
        .from(cisSubmissions)
        .where(and(...fallbackConditions))
        .orderBy(desc(cisSubmissions.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(cisSubmissions)
        .where(and(...fallbackConditions)),
    ]);

    submissions = rows;
    total = Number(countRow[0]?.total ?? 0);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/agent" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" />
          Back to customer types
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{CUSTOMER_TYPE_LABELS[customerType]} Submissions</h1>
        <p className="mt-1 text-sm text-zinc-500">{CUSTOMER_TYPE_DESCRIPTIONS[customerType]}</p>
      </div>

      <DashboardFilters showArchivedToggle={supportsArchived} archivedCount={archivedCount} />

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No submissions found</h2>
          <p className="mt-1 text-sm text-zinc-500">Try adjusting your search or filters.</p>
          {!q && !status && (
            <Link href="/agent/new" className={`mt-5 ${buttonVariants()}`}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add New Customer
            </Link>
          )}
        </div>
      ) : (
        <>
          <CisCardGrid
            submissions={submissions.map((s) => ({ ...s, status: s.status as CisStatus }))}
            hrefPrefix="agent"
          />
          <DashboardPagination
            basePath={`/agent/customer-type/${customerType}`}
            currentPage={currentPage}
            totalItems={total}
            pageSize={pageSize}
            searchParams={{ q, status, archived }}
          />
        </>
      )}
    </div>
  );
}
