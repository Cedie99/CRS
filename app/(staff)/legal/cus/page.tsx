import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, cusSubmissions } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RefreshCw, ChevronRight, Clock3 } from "lucide-react";
import { EmptyStateLogo } from "@/components/empty-state-logo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Customer Update Requests — Legal — CRS" };

export default async function LegalCusQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role } = session.user as { role: string };
  if (role !== "legal_approver" && role !== "admin") redirect("/legal");

  const cusList = await db
    .select({
      id: cusSubmissions.id,
      status: cusSubmissions.status,
      createdAt: cusSubmissions.createdAt,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      customerType: cisSubmissions.customerType,
      agentCode: cisSubmissions.agentCode,
    })
    .from(cusSubmissions)
    .innerJoin(cisSubmissions, eq(cusSubmissions.cisId, cisSubmissions.id))
    .where(eq(cusSubmissions.status, "pending_legal_review"))
    .orderBy(desc(cusSubmissions.createdAt));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Legal Review", href: "/legal" },
        { label: "Customer Updates" },
      ]} />
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-teal-50 p-2.5 shrink-0">
          <RefreshCw className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900">Customer Update Requests</h1>
            {cusList.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                <Clock3 className="h-3 w-3" />
                {cusList.length} pending
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            Credit upgrade requests from existing customers awaiting your review.
          </p>
        </div>
      </div>

      {cusList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No pending requests</h2>
          <p className="mt-1 text-sm text-zinc-500">
            No customer update sheets are awaiting legal review right now.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <ul className="divide-y divide-zinc-100">
            {cusList.map((cus) => (
              <li key={cus.id}>
                <Link
                  href={`/legal/cus/${cus.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{cus.tradeName ?? "(Unnamed)"}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {cus.contactPerson && (
                        <span className="text-xs text-zinc-500 truncate">{cus.contactPerson}</span>
                      )}
                      {cus.agentCode && (
                        <span className="text-xs text-zinc-400">Agent: {cus.agentCode}</span>
                      )}
                      <span className="text-xs text-zinc-400 capitalize">
                        {cus.customerType?.replace(/_/g, " ") ?? "—"}
                      </span>
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
