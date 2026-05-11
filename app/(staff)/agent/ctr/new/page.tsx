import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { GitMerge } from "lucide-react";
import { CtrNewForm } from "./ctr-new-form";

export const metadata = { title: "New CTR — Agent — CRS" };

export default async function AgentCtrNewPage() {
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
    .where(
      eq(cisSubmissions.agentId, userId)
    )
    .then((rows) => rows.filter((r) => ["approved", "erp_encoded"].includes(r.status)));

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumbs items={[
        { label: "My Submissions", href: "/agent" },
        { label: "Type Reclassification", href: "/agent/ctr" },
        { label: "New" },
      ]} />
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-50 p-2.5 shrink-0">
          <GitMerge className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">New Reclassification Request</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Request a change to a customer&apos;s type classification.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <CtrNewForm approvedCisList={approvedCisList} />
      </div>
    </div>
  );
}
