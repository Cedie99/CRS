import { eq, desc, and, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { CisCard } from "@/components/cis-card";
import { DashboardFilters } from "@/components/dashboard-filters";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

export const metadata = { title: "Approval Queue — CRS" };

export default async function ApproverDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q } = await searchParams;

  const conditions: any[] = [eq(cisSubmissions.status, "pending_approval")];

  if (q) {
    conditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )
    );
  }

  const submissions = await db
    .select()
    .from(cisSubmissions)
    .where(and(...conditions))
    .orderBy(desc(cisSubmissions.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Approval Queue</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Final review and approval of CRS submissions.
        </p>
      </div>

      <DashboardFilters showStatusFilter={false} />

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-16 text-center">
          <FileText className="h-10 w-10 text-zinc-300" />
          <h2 className="mt-3 text-sm font-medium text-zinc-900">
            {q ? "No matching submissions" : "No pending submissions"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q ? "Try adjusting your search." : "No submissions awaiting approval."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {submissions.map((s) => (
            <CisCard
              key={s.id}
              id={s.id}
              tradeName={s.tradeName}
              contactPerson={s.contactPerson}
              customerType={s.customerType}
              agentCode={s.agentCode}
              status={s.status as any}
              createdAt={s.createdAt}
              href={`/approver/${s.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
