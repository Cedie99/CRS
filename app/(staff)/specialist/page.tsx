import { desc, and, ilike, or, count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { CustomerTypeNavCards } from "@/components/customer-type-nav-cards";
import { getPageNumber } from "@/components/dashboard-pagination";
import { DashboardFilters } from "@/components/dashboard-filters";
import { redirect } from "next/navigation";
import { Database, CheckCircle } from "lucide-react";

export const metadata = { title: "Project Development — CRS" };

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

export default async function SpecialistDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q, page } = await searchParams;
  const currentPage = getPageNumber(page);
  const pageSize = 12;
  const offset = (currentPage - 1) * pageSize;

  const baseConditions: any[] = [eq(cisSubmissions.status, "pending_erp_encoding")];
  if (q) {
    baseConditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )!
    );
  }

  const [rows, countRow] = await Promise.all([
    db
      .select(SUBMISSION_COLS)
      .from(cisSubmissions)
      .innerJoin(users, eq(cisSubmissions.agentId, users.id))
      .where(and(...baseConditions))
      .orderBy(desc(cisSubmissions.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...baseConditions)),
  ]);

  const total = Number(countRow[0]?.total ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5">
            <Database className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">ERP Encoding Queue</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Approved accounts pending ERP encoding.</p>
          </div>
        </div>
        {total > 0 && (
          <span className="shrink-0 rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
            {total} pending
          </span>
        )}
      </div>

      <DashboardFilters />

      <CustomerTypeNavCards
        basePath="/specialist"
        searchParams={{ q }}
        submissions={rows}
      />

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <div className="rounded-full bg-zinc-100 p-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-zinc-900">
            {q ? "No matches found" : "Queue is clear"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q ? "Try adjusting your search." : "No accounts waiting for ERP encoding."}
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
