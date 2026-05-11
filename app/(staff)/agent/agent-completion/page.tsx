import Link from "next/link";
import { and, desc, eq, ilike, or, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CisCard } from "@/components/cis-card";
import type { CisStatus } from "@/components/status-badge";

export const metadata = { title: "Awaiting Agent Completion — CRS" };

export default async function AgentCompletionQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q } = await searchParams;

  const conditions = [
    eq(cisSubmissions.agentId, session.user.id),
    eq(cisSubmissions.status, "submitted"),
  ];

  if (q) {
    conditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )!
    );
  }

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: cisSubmissions.id,
        tradeName: cisSubmissions.tradeName,
        contactPerson: cisSubmissions.contactPerson,
        customerType: cisSubmissions.customerType,
        agentCode: cisSubmissions.agentCode,
        status: cisSubmissions.status,
        createdAt: cisSubmissions.createdAt,
        updatedAt: cisSubmissions.updatedAt,
      })
      .from(cisSubmissions)
      .where(and(...conditions))
      .orderBy(desc(cisSubmissions.updatedAt)),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...conditions)),
  ]);

  const total = Number(countRow[0]?.total ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "My Submissions", href: "/agent" }, { label: "Agent Completion" }]} className="mb-2" />
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Awaiting Agent Completion</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Customer has submitted these forms. Complete the agent section to continue routing.
        </p>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No pending agent completion</h2>
          <p className="mt-1 text-sm text-zinc-500">All customer-submitted forms have been completed by the agent.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-600">
              {total} submission{total !== 1 ? "s" : ""} awaiting action
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <CisCard
                key={row.id}
                id={row.id}
                tradeName={row.tradeName}
                contactPerson={row.contactPerson}
                customerType={row.customerType}
                agentCode={row.agentCode}
                status={row.status as CisStatus}
                createdAt={row.createdAt}
                updatedAt={row.updatedAt ?? undefined}
                href={`/agent/${row.id}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
