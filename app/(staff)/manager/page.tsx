import { eq, desc, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { CisCard } from "@/components/cis-card";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

export const metadata = { title: "Endorsement Queue — CIS" };

export default async function ManagerDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch agents under this manager
  const myAgents = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(eq(users.managerId, session.user.id));

  const agentIds = myAgents.map((a) => a.id);

  const pending =
    agentIds.length === 0
      ? []
      : await db
          .select({
            id: cisSubmissions.id,
            tradeName: cisSubmissions.tradeName,
            contactPerson: cisSubmissions.contactPerson,
            customerType: cisSubmissions.customerType,
            agentCode: cisSubmissions.agentCode,
            agentId: cisSubmissions.agentId,
            status: cisSubmissions.status,
            createdAt: cisSubmissions.createdAt,
            agentName: users.fullName,
          })
          .from(cisSubmissions)
          .innerJoin(users, eq(cisSubmissions.agentId, users.id))
          .where(
            and(
              inArray(cisSubmissions.agentId, agentIds),
              eq(cisSubmissions.status, "pending_endorsement")
            )
          )
          .orderBy(desc(cisSubmissions.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Endorsement Queue</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Review and endorse CIS submissions from your agents.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-16 text-center">
          <FileText className="h-10 w-10 text-zinc-300" />
          <h2 className="mt-3 text-sm font-medium text-zinc-900">No pending submissions</h2>
          <p className="mt-1 text-sm text-zinc-500">
            All submissions from your agents have been processed.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pending.map((s) => (
            <CisCard
              key={s.id}
              id={s.id}
              tradeName={s.tradeName}
              contactPerson={s.contactPerson}
              customerType={s.customerType}
              agentCode={s.agentCode}
              agentName={s.agentName}
              status={s.status as any}
              createdAt={s.createdAt}
              href={`/manager/${s.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
