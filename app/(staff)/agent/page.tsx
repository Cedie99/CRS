import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { CisCard } from "@/components/cis-card";
import { buttonVariants } from "@/lib/button-variants";
import { Plus, FileText, Clock, CheckCircle, XCircle } from "lucide-react";

export const metadata = { title: "My Submissions — CIS" };

export default async function AgentDashboard() {
  const session = await auth();
  const submissions = await db
    .select()
    .from(cisSubmissions)
    .where(eq(cisSubmissions.agentId, session!.user.id))
    .orderBy(desc(cisSubmissions.createdAt));

  const total = submissions.length;
  const active = submissions.filter((s) =>
    ["submitted", "pending_endorsement", "pending_legal_review", "pending_finance_review", "pending_approval", "approved"].includes(s.status)
  ).length;
  const completed = submissions.filter((s) => s.status === "erp_encoded").length;
  const denied = submissions.filter((s) => s.status === "denied" || s.status === "returned").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">My Submissions</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Track your CIS form submissions.
            {session!.user.agentCode && (
              <span className="ml-1 font-mono text-zinc-400">· {session!.user.agentCode}</span>
            )}
          </p>
        </div>
        <Link href="/agent/new" className={buttonVariants()}>
          <Plus className="mr-1.5 h-4 w-4" />
          New CIS
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: total, icon: FileText, color: "text-zinc-500" },
          { label: "Active", value: active, icon: Clock, color: "text-blue-500" },
          { label: "Completed", value: completed, icon: CheckCircle, color: "text-green-500" },
          { label: "Returned / Denied", value: denied, icon: XCircle, color: "text-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs font-medium text-zinc-500">{label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-16 text-center">
          <FileText className="h-10 w-10 text-zinc-300" />
          <h2 className="mt-3 text-sm font-medium text-zinc-900">No submissions yet</h2>
          <p className="mt-1 text-sm text-zinc-500">Start by submitting a new CIS form.</p>
          <Link href="/agent/new" className={`mt-4 ${buttonVariants()}`}>
            <Plus className="mr-1.5 h-4 w-4" />
            New CIS
          </Link>
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
              href={`/agent/${s.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
