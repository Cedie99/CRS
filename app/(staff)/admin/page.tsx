import Link from "next/link";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/lib/button-variants";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "@/lib/utils";
import { Users } from "lucide-react";

export const metadata = { title: "Admin — All Submissions — CIS" };

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  fs_petroleum: "FS Petroleum",
  special: "Special",
};

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const submissions = await db
    .select()
    .from(cisSubmissions)
    .orderBy(desc(cisSubmissions.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">All Submissions</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Master list of all CIS submissions across the system.
          </p>
        </div>
        <Link href="/admin/users" className={buttonVariants({ variant: "outline" })}>
          <Users className="mr-1.5 h-4 w-4" />
          Manage Users
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Total", submissions.length, "text-zinc-500"],
            ["Active", submissions.filter((s) => ["submitted", "pending_endorsement", "pending_legal_review", "pending_finance_review", "pending_approval"].includes(s.status)).length, "text-blue-500"],
            ["Approved / Encoded", submissions.filter((s) => ["approved", "erp_encoded"].includes(s.status)).length, "text-green-500"],
            ["Denied / Returned", submissions.filter((s) => ["denied", "returned"].includes(s.status)).length, "text-red-500"],
          ] as [string, number, string][]
        ).map(([label, value, color]) => (
          <div key={label} className="rounded-xl border bg-white p-4">
            <p className={`text-xs font-medium ${color}`}>{label}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Trade Name</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-400">
                  No submissions yet.
                </td>
              </tr>
            ) : (
              submissions.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {s.tradeName ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {s.agentCode}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {CUSTOMER_TYPE_LABELS[s.customerType] ?? s.customerType}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status as any} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {formatDistanceToNow(s.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/${s.id}`}
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
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
  );
}
