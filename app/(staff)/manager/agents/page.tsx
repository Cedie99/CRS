import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Users, ArrowRight } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";

export const metadata = { title: "My Agents — CRS" };

const IN_PROGRESS_STATUSES: CisStatus[] = [
  "submitted",
  "pending_legal_review",
  "pending_finance_review",
  "pending_approval",
  "approved",
];

export default async function ManagerAgentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const agents = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      agentCode: users.agentCode,
      agentType: users.agentType,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(and(eq(users.managerId, session.user.id), eq(users.isActive, true)));

  const agentIds = agents.map((a) => a.id);

  const submissions =
    agentIds.length > 0
      ? await db
          .select({ agentId: cisSubmissions.agentId, status: cisSubmissions.status })
          .from(cisSubmissions)
          .where(inArray(cisSubmissions.agentId, agentIds))
      : [];

  // Group submissions by agentId
  const statsByAgent = new Map<
    string,
    {
      total: number;
      pendingEndorsement: number;
      inProgress: number;
      erpEncoded: number;
      deniedReturned: number;
    }
  >();

  for (const agent of agents) {
    statsByAgent.set(agent.id, {
      total: 0,
      pendingEndorsement: 0,
      inProgress: 0,
      erpEncoded: 0,
      deniedReturned: 0,
    });
  }

  for (const s of submissions) {
    const stats = statsByAgent.get(s.agentId);
    if (!stats) continue;
    stats.total++;
    if (s.status === "pending_endorsement") {
      stats.pendingEndorsement++;
    } else if (IN_PROGRESS_STATUSES.includes(s.status as CisStatus)) {
      stats.inProgress++;
    } else if (s.status === "erp_encoded") {
      stats.erpEncoded++;
    } else if (s.status === "denied" || s.status === "returned") {
      stats.deniedReturned++;
    }
  }

  const totalAgents = agents.length;
  const totalSubmissions = submissions.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5">
          <Users className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">My Agents</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Roster of agents assigned to you.{" "}
            <span className="font-medium text-zinc-700">
              {totalAgents} agent{totalAgents !== 1 ? "s" : ""}
            </span>
            {" · "}
            <span className="font-medium text-zinc-700">
              {totalSubmissions} submission{totalSubmissions !== 1 ? "s" : ""}
            </span>
          </p>
        </div>
      </div>

      {/* Empty state */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <div className="rounded-full bg-zinc-100 p-4">
            <Users className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No agents assigned</h2>
          <p className="mt-1 text-sm text-zinc-500">
            No active agents are assigned to you yet. Contact your admin.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const stats = statsByAgent.get(agent.id)!;
            const pct =
              stats.total > 0 ? Math.round((stats.erpEncoded / stats.total) * 100) : 0;

            return (
              <div
                key={agent.id}
                className="flex flex-col overflow-hidden rounded-xl border bg-white transition-all duration-200 hover:border-zinc-300 hover:shadow-sm"
              >
                {/* Card header */}
                <div className="flex items-start gap-3 p-5 pb-4">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-blue-100">
                    {agent.avatarUrl ? (
                      <Image
                        src={agent.avatarUrl}
                        alt={agent.fullName}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-blue-700">
                        {agent.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight text-zinc-900">{agent.fullName}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {agent.agentCode && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
                          {agent.agentCode}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                          agent.agentType === "rsr"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {agent.agentType === "rsr" ? "RSR" : "Sales Agent"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats chips */}
                <div className="grid grid-cols-3 gap-1 px-3 pb-4 text-center sm:px-5">
                  <div className="rounded-lg bg-zinc-50 px-2 py-2">
                    <p className="text-lg font-bold tabular-nums text-zinc-900">{stats.total}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                      Total
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 px-2 py-2">
                    <p className="text-lg font-bold tabular-nums text-amber-700">
                      {stats.pendingEndorsement}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">
                      Pending
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 px-2 py-2">
                    <p className="text-lg font-bold tabular-nums text-blue-700">
                      {stats.inProgress}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-blue-500">
                      In Progress
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 px-2 py-2">
                    <p className="text-lg font-bold tabular-nums text-green-700">
                      {stats.erpEncoded}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-green-500">
                      Onboarded
                    </p>
                  </div>
                  <div className="col-span-2 rounded-lg bg-red-50 px-2 py-2">
                    <p className="text-lg font-bold tabular-nums text-red-700">
                      {stats.deniedReturned}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-red-500">
                      Not Accepted
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="px-5 pb-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[11px] text-zinc-400">ERP Completion</p>
                    <p className="text-[11px] font-medium text-zinc-600">{pct}%</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto border-t border-zinc-100 px-5 py-3">
                  <Link
                    href={`/manager?agentId=${agent.id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    View Submissions
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
