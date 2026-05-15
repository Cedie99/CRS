import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions, cisSubmissions } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, GitMerge, ChevronRight, Clock3 } from "lucide-react";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import { CtrNewModal } from "./ctr-new-modal";

export const metadata = { title: "Customer Type Reclassification — Agent — CRS" };

function humanizeType(val: string | null) {
  if (!val) return "—";
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
    submitted: "bg-blue-50 text-blue-700 border-blue-200",
    pending_legal_review: "bg-purple-50 text-purple-700 border-purple-200",
    pending_finance_review: "bg-amber-50 text-amber-700 border-amber-200",
    pending_documents: "bg-orange-50 text-orange-700 border-orange-200",
    pending_approval: "bg-sky-50 text-sky-700 border-sky-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    denied: "bg-red-50 text-red-700 border-red-200",
  };
  const cls = map[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

export default async function AgentCtrListPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, id: userId } = session.user as { role: string; id: string };
  if (role !== "sales_agent" && role !== "rsr") redirect("/agent");

  const approvedCisList = await db
    .select({
      id: cisSubmissions.id,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      customerType: cisSubmissions.customerType,
      status: cisSubmissions.status,
      cityMunicipality: cisSubmissions.cityMunicipality,
      businessType: cisSubmissions.businessType,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.agentId, userId))
    .then((rows) => rows.filter((r) => ["approved", "erp_encoded"].includes(r.status)));

  const ctrList = await db
    .select({
      id: ctrSubmissions.id,
      status: ctrSubmissions.status,
      targetCustomerType: ctrSubmissions.targetCustomerType,
      createdAt: ctrSubmissions.createdAt,
      tradeName: cisSubmissions.tradeName,
      currentCustomerType: cisSubmissions.customerType,
    })
    .from(ctrSubmissions)
    .innerJoin(cisSubmissions, eq(ctrSubmissions.cisId, cisSubmissions.id))
    .where(eq(ctrSubmissions.agentId, userId))
    .orderBy(desc(ctrSubmissions.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5 shrink-0">
            <GitMerge className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900">Customer Type Reclassification</h1>
              {ctrList.filter((c) => !["approved", "denied"].includes(c.status)).length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                  <Clock3 className="h-3 w-3" />
                  {ctrList.filter((c) => !["approved", "denied"].includes(c.status)).length} active
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-zinc-500">
              Requests to change a customer&apos;s type classification.
            </p>
          </div>
        </div>
        <CtrNewModal approvedCisList={approvedCisList} variant="button" />
      </div>

      {ctrList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No reclassification requests</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Create a CTR to request a customer type change for an approved customer.
          </p>
          <CtrNewModal approvedCisList={approvedCisList} variant="empty-state" />
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <ul className="divide-y divide-zinc-100">
            {ctrList.map((ctr) => (
              <li key={ctr.id}>
                <Link
                  href={`/agent/ctr/${ctr.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-zinc-900 truncate">
                      {ctr.tradeName ?? "(Unnamed)"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <span className="capitalize">{humanizeType(ctr.currentCustomerType)}</span>
                        <ArrowRight className="h-3 w-3 text-zinc-400 shrink-0" />
                        <span className="font-semibold text-zinc-700 capitalize">
                          {humanizeType(ctr.targetCustomerType)}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {statusBadge(ctr.status)}
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
