import { eq, and, or, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, cisSubmissions } from "@/lib/db/schema";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import { Users, ClipboardList, CheckCircle, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { EmptyStateLogo } from "@/components/empty-state-logo";

export const metadata = { title: "Team Overview — CRS" };

const ROLE_LABELS: Record<string, string> = {
  sales_manager: "Sales Manager",
  rsr_manager: "RSR Manager",
};

export default async function TeamOverviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Only top-level managers can access this page
  if (!(session.user as any).isTopManager) notFound();

  // All active managers
  const managers = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      agentCode: users.agentCode,
    })
    .from(users)
    .where(
      and(
        or(eq(users.role, "sales_manager"), eq(users.role, "rsr_manager")),
        eq(users.isActive, true)
      )
    );

  const managerIds = managers.map((m) => m.id);

  // All active agents grouped under those managers
  const agents =
    managerIds.length > 0
      ? await db
          .select({
            id: users.id,
            fullName: users.fullName,
            agentCode: users.agentCode,
            agentType: users.agentType,
            avatarUrl: users.avatarUrl,
            managerId: users.managerId,
          })
          .from(users)
          .where(
            and(
              inArray(users.managerId, managerIds),
              eq(users.isActive, true)
            )
          )
      : [];

  const agentIds = agents.map((a) => a.id);

  // Submissions for all those agents
  const submissions =
    agentIds.length > 0
      ? await db
          .select({
            agentId: cisSubmissions.agentId,
            status: cisSubmissions.status,
          })
          .from(cisSubmissions)
          .where(inArray(cisSubmissions.agentId, agentIds))
      : [];

  // Build per-manager stats
  type ManagerStats = {
    agents: typeof agents;
    total: number;
    inProgress: number;
    completed: number;
    denied: number;
  };

  const managerStats = new Map<string, ManagerStats>();
  for (const m of managers) {
    managerStats.set(m.id, { agents: [], total: 0, inProgress: 0, completed: 0, denied: 0 });
  }
  for (const a of agents) {
    if (a.managerId) managerStats.get(a.managerId)?.agents.push(a);
  }
  for (const s of submissions) {
    const agentManagerId = agents.find((a) => a.id === s.agentId)?.managerId;
    if (!agentManagerId) continue;
    const ms = managerStats.get(agentManagerId);
    if (!ms) continue;
    ms.total++;
    if (["submitted", "pending_endorsement", "pending_legal_review", "pending_finance_review", "pending_approval", "approved", "pending_erp_encoding"].includes(s.status)) ms.inProgress++;
    else if (s.status === "erp_encoded") ms.completed++;
    else if (s.status === "denied" || s.status === "returned") ms.denied++;
  }

  const totalManagers = managers.length;
  const totalAgents = agents.length;
  const totalSubmissions = submissions.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-50 p-2.5">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Team Overview</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              All managers and their agents across the entire team.
            </p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Managers</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">{totalManagers}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Agents</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">{totalAgents}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Total Submissions</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">{totalSubmissions}</p>
        </div>
      </div>

      {/* Manager cards */}
      {managers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No managers yet</h2>
          <p className="mt-1 text-sm text-zinc-500">Managers will appear here once accounts are created.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {managers.map((manager) => {
            const stats = managerStats.get(manager.id)!;
            const initials = manager.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

            return (
              <div key={manager.id} className="overflow-hidden rounded-xl border bg-white">
                {/* Manager header */}
                <div className="flex items-center gap-4 border-b bg-zinc-50 px-5 py-4">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-violet-100">
                    {manager.avatarUrl ? (
                      <Image src={manager.avatarUrl} alt={manager.fullName} width={40} height={40} className="h-full w-full object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-violet-700">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-zinc-900">{manager.fullName}</p>
                    <p className="text-xs text-zinc-500">{ROLE_LABELS[manager.role] ?? manager.role} · {manager.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-5 text-center">
                    <div>
                      <p className="text-lg font-bold text-zinc-900">{stats.agents.length}</p>
                      <p className="text-[11px] text-zinc-400">Agents</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-zinc-900">{stats.total}</p>
                      <p className="text-[11px] text-zinc-400">Submissions</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-600">{stats.completed}</p>
                      <p className="text-[11px] text-zinc-400">Completed</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-600">{stats.inProgress}</p>
                      <p className="text-[11px] text-zinc-400">In Progress</p>
                    </div>
                  </div>
                </div>

                {/* Agent list */}
                {stats.agents.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-zinc-400 italic">No agents assigned to this manager.</div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {stats.agents.map((agent) => {
                      const agentSubs = submissions.filter((s) => s.agentId === agent.id);
                      const agentTotal = agentSubs.length;
                      const agentInProgress = agentSubs.filter((s) =>
                        ["submitted","pending_endorsement","pending_legal_review","pending_finance_review","pending_approval","approved","pending_erp_encoding"].includes(s.status)
                      ).length;
                      const agentCompleted = agentSubs.filter((s) => s.status === "erp_encoded").length;
                      const agentInitials = agent.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

                      return (
                        <div key={agent.id} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50">
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-blue-100">
                            {agent.avatarUrl ? (
                              <Image src={agent.avatarUrl} alt={agent.fullName} width={32} height={32} className="h-full w-full object-cover" unoptimized />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-blue-700">
                                {agentInitials}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-900">{agent.fullName}</p>
                            <p className="text-xs text-zinc-400">
                              {agent.agentCode ?? "No code"} · {agent.agentType === "rsr" ? "RSR" : "Sales Agent"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-4 text-right text-xs">
                            <div className="flex items-center gap-1 text-zinc-500">
                              <ClipboardList className="h-3.5 w-3.5" />
                              <span>{agentTotal}</span>
                            </div>
                            <div className="flex items-center gap-1 text-amber-600">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{agentInProgress}</span>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>{agentCompleted}</span>
                            </div>
                            <Link
                              href={`/manager?agentId=${agent.id}`}
                              className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                            >
                              View
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
