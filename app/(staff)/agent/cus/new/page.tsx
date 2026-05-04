import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { RefreshCw, CheckCircle2, Info } from "lucide-react";
import { CusNewForm } from "./cus-new-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "New Customer Update Sheet — CRS" };

export default async function CusNewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, id: userId } = session.user as { role: string; id: string };
  if (role !== "sales_agent" && role !== "rsr") redirect("/agent");

  const all = await db
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
    .orderBy(asc(cisSubmissions.tradeName))
    .catch(() => [] as never[]);

  const eligible = all.filter((c) => c.status === "approved" || c.status === "erp_encoded");

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Customer Updates", href: "/agent/cus" },
        { label: "New CUS" },
      ]} />
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-teal-50 p-2.5 shrink-0">
          <RefreshCw className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">New Customer Update Sheet</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Submit additional documents for an existing customer applying for credit terms.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: info panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-zinc-500 shrink-0" />
              <p className="text-sm font-semibold text-zinc-800">What is a CUS?</p>
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed">
              A <strong className="text-zinc-800">Customer Update Sheet</strong> lets an existing customer on{" "}
              <strong className="text-zinc-800">Prepaid or COD</strong> terms apply for credit (30 or 60 days).
              You upload their updated documents, and Finance or Legal evaluates the request.
            </p>
            <ul className="space-y-2.5">
              {[
                "Only customers with a completed CIS are eligible",
                "Files are appended — nothing from the original CIS is deleted",
                "Dealer customers → Legal (Maam Cha)",
                "All other types → Finance (Maam Nida)",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-zinc-600">
                  <CheckCircle2 className="h-4 w-4 text-zinc-400 shrink-0 mt-px" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {eligible.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-5 text-center space-y-1">
              <p className="text-sm font-medium text-zinc-600">No eligible customers</p>
              <p className="text-xs text-zinc-400">
                Customers are eligible once their CIS is fully approved and ERP-encoded.
              </p>
            </div>
          )}
        </div>

        {/* Right: form */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <CusNewForm approvedCisList={eligible as Parameters<typeof CusNewForm>[0]["approvedCisList"]} />
          </div>
        </div>
      </div>
    </div>
  );
}
