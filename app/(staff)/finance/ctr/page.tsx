import { eq, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, ctrSubmissions } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GitMerge, ChevronRight, Clock3, ArrowRight } from "lucide-react";
import { EmptyStateLogo } from "@/components/empty-state-logo";

export const metadata = { title: "Customer Type Reclassification — Finance — CRS" };

export default async function FinanceCtrQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role } = session.user as { role: string };
  if (role !== "finance_reviewer" && role !== "admin") redirect("/finance");

  const allRows = await db
    .select({
      id: ctrSubmissions.id,
      status: ctrSubmissions.status,
      targetCustomerType: ctrSubmissions.targetCustomerType,
      createdAt: ctrSubmissions.createdAt,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      currentCustomerType: cisSubmissions.customerType,
      agentCode: cisSubmissions.agentCode,
    })
    .from(ctrSubmissions)
    .innerJoin(cisSubmissions, eq(ctrSubmissions.cisId, cisSubmissions.id))
    .where(inArray(ctrSubmissions.status, ["pending_finance_review", "pending_documents"]))
    .orderBy(desc(ctrSubmissions.createdAt));

  // Finance handles non-dealer target types
  const ctrList = allRows.filter((r) => r.targetCustomerType !== "dealer");

  function humanizeType(val: string | null) {
    if (!val) return "—";
    return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-50 p-2.5 shrink-0">
          <GitMerge className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900">Customer Type Reclassification</h1>
            {ctrList.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                <Clock3 className="h-3 w-3" />
                {ctrList.length} pending
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            Reclassification requests awaiting your review.
          </p>
        </div>
      </div>

      {ctrList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No pending requests</h2>
          <p className="mt-1 text-sm text-zinc-500">
            No type reclassification requests awaiting finance review.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <ul className="divide-y divide-zinc-100">
            {ctrList.map((ctr) => (
              <li key={ctr.id}>
                <Link
                  href={`/finance/ctr/${ctr.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{ctr.tradeName ?? "(Unnamed)"}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                      {ctr.contactPerson && <span>{ctr.contactPerson}</span>}
                      {ctr.agentCode && <span className="text-zinc-400">Agent: {ctr.agentCode}</span>}
                      <span className="flex items-center gap-1">
                        <span className="capitalize">{humanizeType(ctr.currentCustomerType)}</span>
                        <ArrowRight className="h-3 w-3 text-zinc-400 shrink-0" />
                        <span className="font-semibold text-zinc-700 capitalize">{humanizeType(ctr.targetCustomerType)}</span>
                      </span>
                      {ctr.status === "pending_documents" && (
                        <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-semibold">
                          Docs Requested
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-[11px] text-zinc-400">
                      {new Date(ctr.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
