import { eq, desc, and, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { CisCard } from "@/components/cis-card";
import { DashboardFilters } from "@/components/dashboard-filters";
import { redirect } from "next/navigation";
import { FileText, Scale } from "lucide-react";

export const metadata = { title: "Legal Review Queue — CRS" };

export default async function LegalDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q } = await searchParams;

  const conditions: any[] = [eq(cisSubmissions.status, "pending_legal_review")];

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-purple-50 p-2.5">
            <Scale className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Legal Review Queue</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Review FS Petroleum and Special customer submissions requiring legal clearance.
            </p>
          </div>
        </div>
        {submissions.length > 0 && (
          <span className="shrink-0 rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
            {submissions.length} pending
          </span>
        )}
      </div>

      <DashboardFilters showStatusFilter={false} />

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <div className="rounded-full bg-zinc-100 p-4">
            <FileText className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-zinc-900">
            {q ? "No matching submissions" : "Queue is clear"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q ? "Try adjusting your search." : "No submissions awaiting legal review."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              href={`/legal/${s.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
