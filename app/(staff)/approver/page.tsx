import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { CisCard } from "@/components/cis-card";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

export const metadata = { title: "Approval Queue — CIS" };

export default async function ApproverDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const submissions = await db
    .select()
    .from(cisSubmissions)
    .where(eq(cisSubmissions.status, "pending_approval"))
    .orderBy(desc(cisSubmissions.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Approval Queue</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Final review and approval of CIS submissions.
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-16 text-center">
          <FileText className="h-10 w-10 text-zinc-300" />
          <h2 className="mt-3 text-sm font-medium text-zinc-900">No pending submissions</h2>
          <p className="mt-1 text-sm text-zinc-500">No submissions awaiting approval.</p>
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
