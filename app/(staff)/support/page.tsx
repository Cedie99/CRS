import { inArray, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { CisCard } from "@/components/cis-card";
import { redirect } from "next/navigation";
import { FileText, Database, XCircle } from "lucide-react";

export const metadata = { title: "Sales Support — CIS" };

export default async function SupportDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const submissions = await db
    .select()
    .from(cisSubmissions)
    .where(inArray(cisSubmissions.status, ["approved", "erp_encoded", "denied"]))
    .orderBy(desc(cisSubmissions.updatedAt));

  const pendingEncoding = submissions.filter((s) => s.status === "approved");
  const encoded = submissions.filter((s) => s.status === "erp_encoded");
  const denied = submissions.filter((s) => s.status === "denied");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Sales Support</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Manage ERP encoding for approved submissions and review denied forms.
        </p>
      </div>

      {/* Pending ERP encoding */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-green-500" />
          <h2 className="text-sm font-semibold text-zinc-700">
            Pending ERP Encoding
            {pendingEncoding.length > 0 && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                {pendingEncoding.length}
              </span>
            )}
          </h2>
        </div>
        {pendingEncoding.length === 0 ? (
          <p className="text-sm text-zinc-400">No submissions awaiting ERP encoding.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingEncoding.map((s) => (
              <CisCard
                key={s.id}
                id={s.id}
                tradeName={s.tradeName}
                contactPerson={s.contactPerson}
                customerType={s.customerType}
                agentCode={s.agentCode}
                status={s.status as any}
                createdAt={s.createdAt}
                href={`/support/${s.id}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recently encoded */}
      {encoded.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-500">Recently Encoded</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {encoded.slice(0, 6).map((s) => (
              <CisCard
                key={s.id}
                id={s.id}
                tradeName={s.tradeName}
                contactPerson={s.contactPerson}
                customerType={s.customerType}
                agentCode={s.agentCode}
                status={s.status as any}
                createdAt={s.createdAt}
                href={`/support/${s.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Denied submissions */}
      {denied.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold text-zinc-500">Denied Submissions</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {denied.slice(0, 6).map((s) => (
              <CisCard
                key={s.id}
                id={s.id}
                tradeName={s.tradeName}
                contactPerson={s.contactPerson}
                customerType={s.customerType}
                agentCode={s.agentCode}
                status={s.status as any}
                createdAt={s.createdAt}
                href={`/support/${s.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {submissions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-16 text-center">
          <FileText className="h-10 w-10 text-zinc-300" />
          <h2 className="mt-3 text-sm font-medium text-zinc-900">No submissions yet</h2>
          <p className="mt-1 text-sm text-zinc-500">Approved submissions will appear here.</p>
        </div>
      )}
    </div>
  );
}
