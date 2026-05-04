import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, cusSubmissions } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RefreshCw, Plus, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/lib/button-variants";
import { EmptyStateLogo } from "@/components/empty-state-logo";

export const metadata = { title: "Customer Updates — CRS" };

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_finance_review: "Pending Finance Review",
  pending_legal_review: "Pending Legal Review",
  approved: "Approved",
  denied: "Denied",
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  submitted: "bg-amber-50 text-amber-700 border-amber-200",
  pending_finance_review: "bg-amber-50 text-amber-700 border-amber-200",
  pending_legal_review: "bg-purple-50 text-purple-700 border-purple-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  denied: "bg-red-50 text-red-700 border-red-200",
};

export default async function AgentCusListPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, id: userId } = session.user as { role: string; id: string };
  if (role !== "sales_agent" && role !== "rsr") redirect("/agent");

  const cusList = await db
    .select({
      id: cusSubmissions.id,
      status: cusSubmissions.status,
      createdAt: cusSubmissions.createdAt,
      note: cusSubmissions.note,
      financeCreditTerms: cusSubmissions.financeCreditTerms,
      financeCreditLimit: cusSubmissions.financeCreditLimit,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      customerType: cisSubmissions.customerType,
    })
    .from(cusSubmissions)
    .innerJoin(cisSubmissions, eq(cusSubmissions.cisId, cisSubmissions.id))
    .where(eq(cusSubmissions.agentId, userId))
    .orderBy(desc(cusSubmissions.createdAt))
    .catch(() => [] as never[]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-50 p-2.5 shrink-0">
            <RefreshCw className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Customer Updates</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Credit term upgrade requests you submitted on behalf of customers.
            </p>
          </div>
        </div>
        <Link href="/agent/cus/new" className={`mt-6 ${buttonVariants({ variant: "default", size: "sm" })}`}>
          <Plus className="h-4 w-4 mr-1.5" />
          New CUS
        </Link>
      </div>

      {cusList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No customer updates yet</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Create a Customer Update Sheet when a customer wants to apply for credit terms.
          </p>
          <Link href="/agent/cus/new" className={`mt-4 ${buttonVariants({ variant: "default", size: "sm" })}`}>
            <Plus className="h-4 w-4 mr-1.5" />
            New CUS
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <ul className="divide-y divide-zinc-100">
            {cusList.map((cus) => (
              <li key={cus.id}>
                <Link
                  href={`/agent/cus/${cus.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="text-sm font-semibold text-zinc-900 truncate">
                        {cus.tradeName ?? "(Unnamed)"}
                      </p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASSES[cus.status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>
                        {STATUS_LABELS[cus.status] ?? cus.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {cus.contactPerson && (
                        <span className="text-xs text-zinc-500">{cus.contactPerson}</span>
                      )}
                      <span className="text-xs text-zinc-400 capitalize">
                        {cus.customerType?.replace(/_/g, " ") ?? "—"}
                      </span>
                      {cus.status === "approved" && cus.financeCreditTerms && (
                        <span className="text-xs font-medium text-green-700">
                          → {cus.financeCreditTerms.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          {cus.financeCreditLimit ? ` · ${cus.financeCreditLimit}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-[11px] text-zinc-400">
                      {new Date(cus.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
