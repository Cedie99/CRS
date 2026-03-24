import { eq, desc, and, inArray, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { CisCard } from "@/components/cis-card";
import { DashboardFilters } from "@/components/dashboard-filters";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

export const metadata = { title: "Endorsement Queue — CRS" };

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending_endorsement", label: "Pending Endorsement" },
  { value: "endorsed", label: "Endorsed" },
  { value: "returned", label: "Returned" },
];

export default async function ManagerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q, status } = await searchParams;

  // Fetch agents under this manager
  const myAgents = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(eq(users.managerId, session.user.id));

  const agentIds = myAgents.map((a) => a.id);

  if (agentIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Endorsement Queue</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Review and endorse CRS submissions from your agents.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-16 text-center">
          <FileText className="h-10 w-10 text-zinc-300" />
          <h2 className="mt-3 text-sm font-medium text-zinc-900">No agents assigned</h2>
          <p className="mt-1 text-sm text-zinc-500">No agents are assigned to you yet.</p>
        </div>
      </div>
    );
  }

  const conditions: ReturnType<typeof eq>[] = [
    inArray(cisSubmissions.agentId, agentIds) as any,
    eq(cisSubmissions.status, "pending_endorsement") as any,
  ];

  if (q) {
    conditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )! as any
    );
  }

  const pending = await db
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
    .where(and(...(conditions as any)))
    .orderBy(desc(cisSubmissions.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Endorsement Queue</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Review and endorse CRS submissions from your agents.
        </p>
      </div>

      <DashboardFilters showStatusFilter={false} />

      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-16 text-center">
          <FileText className="h-10 w-10 text-zinc-300" />
          <h2 className="mt-3 text-sm font-medium text-zinc-900">
            {q ? "No matching submissions" : "No pending submissions"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q
              ? "Try adjusting your search."
              : "All submissions from your agents have been processed."}
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
