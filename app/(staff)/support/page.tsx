import { inArray, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { CisCard } from "@/components/cis-card";
import { redirect } from "next/navigation";
import { FileText, Database, XCircle, CheckCircle2, Clock } from "lucide-react";

export const metadata = { title: "Sales Support — CRS" };

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

  const stats = [
    {
      label: "Ready to Onboard",
      value: pendingEncoding.length,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
    },
    {
      label: "Onboarded",
      value: encoded.length,
      icon: Database,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Denied",
      value: denied.length,
      icon: XCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Sales Support</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Enter approved customers into the system and review denied forms.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      {/* Pending ERP encoding */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-50 p-1.5">
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-800">Ready to Onboard</h2>
            <p className="text-xs text-zinc-500">Approved customers waiting to be entered into the system</p>
          </div>
          {pendingEncoding.length > 0 && (
            <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              {pendingEncoding.length}
            </span>
          )}
        </div>
        {pendingEncoding.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-white py-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-green-300" />
            <p className="mt-2 text-sm font-medium text-zinc-600">All clear!</p>
            <p className="text-xs text-zinc-400">No approved customers are waiting to be onboarded.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-1.5">
              <Database className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-800">Recently Onboarded</h2>
              <p className="text-xs text-zinc-500">Last {Math.min(encoded.length, 6)} completed customers</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Denied */}
      {denied.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-1.5">
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-800">Denied Submissions</h2>
              <p className="text-xs text-zinc-500">Last {Math.min(denied.length, 6)} denied submissions</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <div className="rounded-full bg-zinc-100 p-4">
            <FileText className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-zinc-900">No submissions yet</h2>
          <p className="mt-1 text-sm text-zinc-500">Approved submissions will appear here.</p>
        </div>
      )}
    </div>
  );
}
