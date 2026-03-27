import Link from "next/link";
import { eq, desc, and, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { CisCard } from "@/components/cis-card";
import { DashboardFilters } from "@/components/dashboard-filters";
import { buttonVariants } from "@/lib/button-variants";
import { Plus, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";

export const metadata = { title: "My Submissions — CRS" };

export default async function AgentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  const { q, status } = await searchParams;

  const conditions = [eq(cisSubmissions.agentId, session!.user.id)];

  if (q) {
    conditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )!
    );
  }
  if (status) {
    conditions.push(eq(cisSubmissions.status, status as CisStatus));
  }

  const submissions = await db
    .select()
    .from(cisSubmissions)
    .where(and(...conditions))
    .orderBy(desc(cisSubmissions.createdAt));

  const all = await db
    .select()
    .from(cisSubmissions)
    .where(eq(cisSubmissions.agentId, session!.user.id));

  const total = all.length;
  const active = all.filter((s) =>
    ["submitted", "pending_endorsement", "pending_legal_review", "pending_finance_review", "pending_approval", "approved"].includes(s.status)
  ).length;
  const completed = all.filter((s) => s.status === "erp_encoded").length;
  const denied = all.filter((s) => s.status === "denied" || s.status === "returned").length;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const stats = [
    {
      label: "Total",
      value: total,
      sub: total === 1 ? "1 submission" : `${total} submissions`,
      icon: FileText,
      iconBg: "bg-zinc-100",
      iconColor: "text-zinc-500",
      valueColor: "text-zinc-900",
      barColor: "bg-zinc-400",
      percent: 100,
    },
    {
      label: "In Progress",
      value: active,
      sub: total > 0 ? `${pct(active)}% of total` : "none yet",
      icon: Clock,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      valueColor: "text-blue-700",
      barColor: "bg-blue-400",
      percent: pct(active),
    },
    {
      label: "Onboarded",
      value: completed,
      sub: total > 0 ? `${pct(completed)}% of total` : "none yet",
      icon: CheckCircle,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      valueColor: "text-green-700",
      barColor: "bg-green-500",
      percent: pct(completed),
    },
    {
      label: "Not Accepted",
      value: denied,
      sub: total > 0 ? `${pct(denied)}% of total` : "none yet",
      icon: XCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      valueColor: "text-red-700",
      barColor: "bg-red-400",
      percent: pct(denied),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">My Submissions</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            View and track all customer forms you&apos;ve submitted.
            {session!.user.agentCode && (
              <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-500">
                {session!.user.agentCode}
              </span>
            )}
          </p>
        </div>
        <Link href="/agent/new" className={buttonVariants()}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Customer
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, iconBg, iconColor, valueColor, barColor, percent }) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-xl border bg-white p-5 transition-all duration-200 hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {label}
                </p>
                <p className={`mt-1.5 text-3xl font-bold tabular-nums ${valueColor}`}>
                  {value}
                </p>
                <p className="mt-1 text-xs text-zinc-400">{sub}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
            </div>
            {/* Colored fill bar at bottom showing proportion */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100">
              <div
                className={`h-full transition-all duration-700 ${barColor}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <DashboardFilters />

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <div className="rounded-full bg-zinc-100 p-4">
            <FileText className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-zinc-900">
            {q || status ? "No matching submissions" : "No submissions yet"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q || status
              ? "Try adjusting your search or filters."
              : "Start by adding a new customer. A form link will be generated for them to fill out."}
          </p>
          {!q && !status && (
            <Link href="/agent/new" className={`mt-5 ${buttonVariants()}`}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add New Customer
            </Link>
          )}
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
              status={s.status as CisStatus}
              createdAt={s.createdAt}
              updatedAt={s.updatedAt}
              href={`/agent/${s.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
