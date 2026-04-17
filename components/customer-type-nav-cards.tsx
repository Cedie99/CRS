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
  submissions?: Array<{ customerType?: string | null }>;
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
    const key = normalizeDashboardCustomerType(row.customerType);
    counts[key] += 1;
  }

  const total = Object.values(counts).reduce((sum, current) => sum + current, 0);

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Customer Types</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {DASHBOARD_CUSTOMER_TYPES.map((customerType) => {
          const active = customerType === activeType;
          const count = counts[customerType];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <Link
              key={customerType}
              href={buildHref(basePath, customerType, searchParams)}
              className={[
                "group relative overflow-hidden rounded-2xl border px-5 py-4 text-zinc-700 transition-all duration-200",
                "hover:-translate-y-0.5 hover:shadow-md",
                active
                  ? "border-[#2d6e1e]/40 bg-linear-to-b from-[#2d6e1e]/5 to-white ring-2 ring-[#2d6e1e]/20"
                  : CUSTOMER_TYPE_ACCENTS[customerType],
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Customer Type</span>
                <ChevronRight className="h-4 w-4 text-zinc-300 transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-zinc-900">{CUSTOMER_TYPE_LABELS[customerType]}</p>
              <p className="mt-1 text-sm text-zinc-500">{CUSTOMER_TYPE_DESCRIPTIONS[customerType]}</p>

              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full transition-all duration-500 ${CUSTOMER_TYPE_BARS[customerType]}`}
                  style={{ width: `${Math.max(pct, total > 0 ? 6 : 0)}%` }}
                />
              </div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold leading-none text-zinc-900">{count}</p>
                  <p className="mt-1 text-xs text-zinc-400">{count === 1 ? "submission" : "submissions"}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CUSTOMER_TYPE_BADGES[customerType]}`}>
                  {pct}% of types
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
