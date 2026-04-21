import { desc, and, ilike, or, count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { CustomerTypeNavCards } from "@/components/customer-type-nav-cards";
import { getPageNumber } from "@/components/dashboard-pagination";
import { DashboardFilters } from "@/components/dashboard-filters";
import { AnimatedDisclosure } from "@/components/animated-disclosure";
import { redirect } from "next/navigation";
import { FileText, Database, XCircle, Clock, LayoutList } from "lucide-react";
import type { CisStatus } from "@/components/status-badge";
import { EmptyStateLogo } from "@/components/empty-state-logo";

export const metadata = { title: "Sales Support — CRS" };

export default async function SupportDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q, status, page } = await searchParams;
  const currentPage = getPageNumber(page);
  const pageSize = 12;
  const offset = (currentPage - 1) * pageSize;

  const searchConditions: any[] = [];

  if (q) {
    searchConditions.push(
      or(
        ilike(cisSubmissions.tradeName, `%${q}%`),
        ilike(cisSubmissions.contactPerson, `%${q}%`)
      )
    );
  }

  if (status) {
    searchConditions.push(eq(cisSubmissions.status, status as CisStatus));
  }

  const pendingConditions = [eq(cisSubmissions.status, "approved"), ...searchConditions];
  const encodedConditions = [eq(cisSubmissions.status, "erp_encoded"), ...searchConditions];
  const deniedConditions = [eq(cisSubmissions.status, "denied"), ...searchConditions];

  const cardSelect = {
    id: cisSubmissions.id,
    tradeName: cisSubmissions.tradeName,
    contactPerson: cisSubmissions.contactPerson,
    customerType: cisSubmissions.customerType,
    agentCode: cisSubmissions.agentCode,
    status: cisSubmissions.status,
    createdAt: cisSubmissions.createdAt,
    updatedAt: cisSubmissions.updatedAt,
  };

  const [pendingEncoding, pendingCountRow, encoded, encodedCountRow, denied, deniedCountRow] = await Promise.all([
    db
      .select(cardSelect)
      .from(cisSubmissions)
      .where(and(...pendingConditions))
      .orderBy(desc(cisSubmissions.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...pendingConditions)),
    db
      .select(cardSelect)
      .from(cisSubmissions)
      .where(and(...encodedConditions))
      .orderBy(desc(cisSubmissions.updatedAt))
      .limit(6),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...encodedConditions)),
    db
      .select(cardSelect)
      .from(cisSubmissions)
      .where(and(...deniedConditions))
      .orderBy(desc(cisSubmissions.updatedAt))
      .limit(6),
    db
      .select({ total: count() })
      .from(cisSubmissions)
      .where(and(...deniedConditions)),
  ]);

  const pendingTotal = Number(pendingCountRow[0]?.total ?? 0);
  const encodedTotal = Number(encodedCountRow[0]?.total ?? 0);
  const deniedTotal = Number(deniedCountRow[0]?.total ?? 0);
  const total = pendingTotal + encodedTotal + deniedTotal;

  const stats = [
    {
      label: "Ready to Onboard",
      value: pendingTotal,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
    },
    {
      label: "Onboarded",
      value: encodedTotal,
      icon: Database,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Denied",
      value: deniedTotal,
      icon: XCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
    },
    {
      label: "Total",
      value: total,
      icon: LayoutList,
      iconBg: "bg-zinc-100",
      iconColor: "text-zinc-500",
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

      <DashboardFilters />

      <AnimatedDisclosure title="Performance Snapshot" className="rounded-xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 p-3 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
                  <p className="mt-1.5 text-xl font-bold tabular-nums text-zinc-900">{value}</p>
                </div>
                <div className={`rounded-lg p-1.5 ${iconBg}`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </AnimatedDisclosure>

      <CustomerTypeNavCards
        basePath="/support"
        searchParams={{ q, status }}
        submissions={[...pendingEncoding, ...encoded, ...denied]}
      />

      {total === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
          <EmptyStateLogo />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">
            {q || status ? "No matching submissions" : "No submissions yet"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {q || status ? "Try adjusting your search or filters." : "Approved submissions will appear here."}
          </p>
        </div>
      )}

      {total > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <strong className="text-zinc-800">Highlighted cards</strong> have submissions to process. Select one to open it.
        </div>
      )}
    </div>
  );
}
