import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/lib/button-variants";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "@/lib/utils";
import { Users, FileText, Activity, CheckCircle2, XCircle, UserPlus } from "lucide-react";

export const metadata = { title: "Admin — All Submissions — CRS" };

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  fs_petroleum: "FS Petroleum",
  special: "Special",
};

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  standard: "bg-zinc-100 text-zinc-600",
  fs_petroleum: "bg-purple-50 text-purple-700",
  special: "bg-amber-50 text-amber-700",
};

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [submissions, pendingUsers] = await Promise.all([
    db.select().from(cisSubmissions).orderBy(desc(cisSubmissions.createdAt)),
    db
      .select({ id: users.id, fullName: users.fullName, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.isActive, false))
      .orderBy(users.createdAt),
  ]);

  const pendingCount = pendingUsers.length;
  const total = submissions.length;
  const active = submissions.filter((s) =>
    ["submitted", "pending_endorsement", "pending_legal_review", "pending_finance_review", "pending_approval"].includes(s.status)
  ).length;
  const done = submissions.filter((s) => ["approved", "erp_encoded"].includes(s.status)).length;
  const closed = submissions.filter((s) => ["denied", "returned"].includes(s.status)).length;

  const stats = [
    { label: "Total", value: total, icon: FileText, iconBg: "bg-zinc-100", iconColor: "text-zinc-500" },
    { label: "In Progress", value: active, icon: Activity, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
    { label: "Approved / Onboarded", value: done, icon: CheckCircle2, iconBg: "bg-green-50", iconColor: "text-green-600" },
    { label: "Denied / Returned", value: closed, icon: XCircle, iconBg: "bg-red-50", iconColor: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">All Submissions</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Overview of all customer submissions across the entire system.
          </p>
        </div>
        <Link href="/admin/users" className={buttonVariants({ variant: "outline" })}>
          <Users className="mr-1.5 h-4 w-4" />
          Manage Users
        </Link>
      </div>

      {/* Pending activations banner */}
      {pendingCount > 0 && (
        <Link
          href="/admin/users"
          className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 transition-colors hover:bg-amber-100"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <UserPlus className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {pendingCount} account{pendingCount !== 1 ? "s" : ""} pending activation
              </p>
              <p className="text-xs text-amber-600">
                {pendingUsers.map((u) => u.fullName).slice(0, 3).join(", ")}
                {pendingCount > 3 ? ` and ${pendingCount - 3} more` : ""}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-medium text-amber-700 hover:underline">
            Review →
          </span>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="rounded-xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">{value}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-zinc-700">All Submissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[560px] w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Trade Name
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Agent
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Type
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Submitted
                </th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-zinc-400">
                    No submissions yet.
                  </td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id} className="group hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-zinc-900">
                      {s.tradeName ?? <span className="font-normal italic text-zinc-400">Untitled</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
                        {s.agentCode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          CUSTOMER_TYPE_COLORS[s.customerType] ?? "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {CUSTOMER_TYPE_LABELS[s.customerType] ?? s.customerType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={s.status as any} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-400">
                      {formatDistanceToNow(s.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/admin/${s.id}`}
                        className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 ring-1 ring-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
