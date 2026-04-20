import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  DASHBOARD_CUSTOMER_TYPES,
  CUSTOMER_TYPE_DESCRIPTIONS,
  CUSTOMER_TYPE_LABELS,
  normalizeDashboardCustomerType,
  type DashboardCustomerType,
} from "@/lib/customer-types";

type QueryValue = string | undefined;

interface CustomerTypeNavCardsProps {
  basePath: string;
  searchParams?: Record<string, QueryValue>;
  activeType?: DashboardCustomerType;
  submissions?: Array<{ customerType?: string | null; status?: string }>;
}

const CUSTOMER_TYPE_ACCENTS: Record<DashboardCustomerType, string> = {
  dealer: "border-blue-200/90 bg-linear-to-b from-blue-50/55 to-white",
  distributor: "border-teal-200/90 bg-linear-to-b from-teal-50/55 to-white",
  private_label: "border-violet-200/90 bg-linear-to-b from-violet-50/55 to-white",
  toll_blend: "border-amber-200/90 bg-linear-to-b from-amber-50/55 to-white",
  end_user: "border-green-200/90 bg-linear-to-b from-green-50/55 to-white",
};

const CUSTOMER_TYPE_BARS: Record<DashboardCustomerType, string> = {
  dealer: "bg-blue-500",
  distributor: "bg-teal-500",
  private_label: "bg-violet-500",
  toll_blend: "bg-amber-500",
  end_user: "bg-green-500",
};

const CUSTOMER_TYPE_BADGES: Record<DashboardCustomerType, string> = {
  dealer: "bg-blue-100 text-blue-700",
  distributor: "bg-teal-100 text-teal-700",
  private_label: "bg-violet-100 text-violet-700",
  toll_blend: "bg-amber-100 text-amber-700",
  end_user: "bg-green-100 text-green-700",
};

function buildHref(
  basePath: string,
  customerType: DashboardCustomerType,
  searchParams?: Record<string, QueryValue>
) {
  const params = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
  }
  const suffix = params.toString();
  return `${basePath}/customer-type/${customerType}${suffix ? `?${suffix}` : ""}`;
}

export function CustomerTypeNavCards({ basePath, searchParams, activeType, submissions }: CustomerTypeNavCardsProps) {
  const counts: Record<DashboardCustomerType, number> = {
    dealer: 0,
    distributor: 0,
    private_label: 0,
    toll_blend: 0,
    end_user: 0,
  };

  for (const row of submissions ?? []) {
    // Exclude drafts — customer type is not finalized until agent fill-out.
    if (row.status === "draft") continue;
    // Exclude customer-submitted rows — agent has not finalized type yet.
    if (row.status === "submitted") continue;
    // Exclude rows without a confirmed type.
    if (!row.customerType) continue;
    const key = normalizeDashboardCustomerType(row.customerType);
    counts[key] += 1;
  }

  const total = Object.values(counts).reduce((sum, current) => sum + current, 0);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Customer Type Filter</h2>
          <p className="mt-0.5 text-xs text-zinc-400">Jump straight to a specific customer type queue.</p>
        </div>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600">
          {total} typed submission{total === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {DASHBOARD_CUSTOMER_TYPES.map((customerType) => {
          const active = customerType === activeType;
          const count = counts[customerType];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <Link
              key={customerType}
              href={buildHref(basePath, customerType, searchParams)}
              className={[
                "group relative overflow-hidden rounded-lg border px-3 py-2.5 text-zinc-700 transition-all duration-200",
                "hover:border-zinc-300 hover:shadow-sm",
                active
                  ? "border-[#2d6e1e]/40 bg-linear-to-b from-[#2d6e1e]/6 to-white ring-2 ring-[#2d6e1e]/20"
                  : CUSTOMER_TYPE_ACCENTS[customerType],
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-base font-semibold leading-tight text-zinc-900">{CUSTOMER_TYPE_LABELS[customerType]}</p>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{CUSTOMER_TYPE_DESCRIPTIONS[customerType]}</p>

              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full transition-all duration-500 ${CUSTOMER_TYPE_BARS[customerType]}`}
                  style={{ width: `${Math.max(pct, total > 0 ? 6 : 0)}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-800">{count} {count === 1 ? "submission" : "submissions"}</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CUSTOMER_TYPE_BADGES[customerType]}`}>
                  {pct}%
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
