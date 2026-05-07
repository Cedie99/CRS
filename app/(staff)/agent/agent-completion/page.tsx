import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Awaiting Agent Completion — CRS" };

export default async function AgentCompletionQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q } = await searchParams;

  const conditions = [
    eq(cisSubmissions.agentId, session.user.id),
    eq(cisSubmissions.status, "submitted"),
  ];

  if (q) {
    conditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )!
    );
  }

  const rows = await db
    .select({
      id: cisSubmissions.id,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      createdAt: cisSubmissions.createdAt,
      updatedAt: cisSubmissions.updatedAt,
    })
    .from(cisSubmissions)
    .where(and(...conditions))
    .orderBy(desc(cisSubmissions.updatedAt));

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "My Submissions", href: "/agent" }, { label: "Agent Completion" }]} className="mb-2" />
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Awaiting Agent Completion</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Customer has submitted these forms. Complete the agent section to continue routing.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No pending agent completion</h2>
          <p className="mt-1 text-sm text-zinc-500">All customer-submitted forms have been completed by the agent.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3.5">
            <p className="text-sm font-semibold text-zinc-700">
              {rows.length} submission{rows.length !== 1 ? "s" : ""} awaiting action
            </p>
          </div>
          <ul className="divide-y divide-zinc-50">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/agent/${row.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-zinc-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <ClipboardCheck className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {row.tradeName ?? <span className="font-normal italic text-zinc-400">Untitled customer</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Customer: {row.contactPerson ?? "-"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Submitted {formatDistanceToNow(row.createdAt)} ago
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 ring-1 ring-blue-200">
                    Complete agent step
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
