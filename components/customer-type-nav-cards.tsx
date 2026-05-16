import Link from "next/link";
import { ChevronRight, Store, Truck, Tag, FlaskConical, Building2 } from "lucide-react";
import {
  DASHBOARD_CUSTOMER_TYPES,
  CUSTOMER_TYPE_DESCRIPTIONS,
  CUSTOMER_TYPE_LABELS,
  normalizeDashboardCustomerType,
  type DashboardCustomerType,
} from "@/lib/customer-types";
import type { ElementType } from "react";

type QueryValue = string | undefined;

interface CustomerTypeNavCardsProps {
  basePath: string;
  searchParams?: Record<string, QueryValue>;
  activeType?: DashboardCustomerType;
  submissions?: Array<{ customerType?: string | null; status?: string }>;
  /** Pre-computed per-type counts from the DB. When provided, overrides counting from submissions. */
  customerTypeCounts?: Partial<Record<DashboardCustomerType, number>>;
}

const CUSTOMER_TYPE_ACCENTS: Record<DashboardCustomerType, string> = {
  dealer: "border-blue-200 bg-linear-to-b from-blue-50/60 to-white hover:border-blue-300 hover:shadow-sm",
  distributor: "border-teal-200 bg-linear-to-b from-teal-50/60 to-white hover:border-teal-300 hover:shadow-sm",
  private_label: "border-violet-200 bg-linear-to-b from-violet-50/60 to-white hover:border-violet-300 hover:shadow-sm",
  toll_blend: "border-amber-200 bg-linear-to-b from-amber-50/60 to-white hover:border-amber-300 hover:shadow-sm",
  end_user: "border-green-200 bg-linear-to-b from-green-50/60 to-white hover:border-green-300 hover:shadow-sm",
};

const CUSTOMER_TYPE_BADGES: Record<DashboardCustomerType, string> = {
  dealer: "bg-blue-100 text-blue-700 ring-1 ring-blue-200/60",
  distributor: "bg-teal-100 text-teal-700 ring-1 ring-teal-200/60",
  private_label: "bg-violet-100 text-violet-700 ring-1 ring-violet-200/60",
  toll_blend: "bg-amber-100 text-amber-700 ring-1 ring-amber-200/60",
  end_user: "bg-green-100 text-green-700 ring-1 ring-green-200/60",
};

const CUSTOMER_TYPE_ICON_BG: Record<DashboardCustomerType, string> = {
  dealer: "bg-blue-100 text-blue-600",
  distributor: "bg-teal-100 text-teal-600",
  private_label: "bg-violet-100 text-violet-600",
  toll_blend: "bg-amber-100 text-amber-600",
  end_user: "bg-green-100 text-green-600",
};

const CUSTOMER_TYPE_CTA: Record<DashboardCustomerType, string> = {
  dealer: "text-blue-600",
  distributor: "text-teal-600",
  private_label: "text-violet-600",
  toll_blend: "text-amber-600",
  end_user: "text-green-600",
};

const CUSTOMER_TYPE_ICONS: Record<DashboardCustomerType, ElementType> = {
  dealer: Store,
  distributor: Truck,
  private_label: Tag,
  toll_blend: FlaskConical,
  end_user: Building2,
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

export function CustomerTypeNavCards({ basePath, searchParams, activeType, submissions, customerTypeCounts }: CustomerTypeNavCardsProps) {
  const counts: Record<DashboardCustomerType, number> = {
    dealer: 0,
    distributor: 0,
    private_label: 0,
    toll_blend: 0,
    end_user: 0,
  };

  if (customerTypeCounts) {
    // Use pre-computed DB counts when available — accurate regardless of pagination.
    for (const [type, n] of Object.entries(customerTypeCounts)) {
      const key = normalizeDashboardCustomerType(type);
      counts[key] = n ?? 0;
    }
  } else {
    for (const row of submissions ?? []) {
      if (row.status === "draft") continue;
      if (row.status === "submitted") continue;
      if (!row.customerType) continue;
      const key = normalizeDashboardCustomerType(row.customerType);
      counts[key] += 1;
    }
  }

  const total = Object.values(counts).reduce((sum, current) => sum + current, 0);

  // Sort by count descending — types with submissions rise to the top.
  // Types with equal count keep their original order.
  const sortedTypes = [...DASHBOARD_CUSTOMER_TYPES].sort((a, b) => counts[b] - counts[a]);

  const activeTypesCount = sortedTypes.filter((t) => counts[t] > 0).length;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-100">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Browse by Customer Type</h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            {total > 0
              ? activeTypesCount === 1
                ? "1 type has submissions — shown first."
                : `${activeTypesCount} of 5 types have submissions — shown first.`
              : "Select a type to view its submissions. All types are currently empty."}
          </p>
        </div>
        {total > 0 && (
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600 tabular-nums">
            {total} submission{total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-5">
        {sortedTypes.map((customerType) => {
          const active = customerType === activeType;
          const count = counts[customerType];
          const hasItems = count > 0;
          const Icon = CUSTOMER_TYPE_ICONS[customerType];

          return (
            <Link
              key={customerType}
              href={buildHref(basePath, customerType, searchParams)}
              className={[
                "group relative overflow-hidden rounded-lg border p-3 transition-all duration-200",
                active
                  ? "border-[#2d6e1e]/40 bg-linear-to-b from-[#2d6e1e]/6 to-white ring-2 ring-[#2d6e1e]/20"
                  : hasItems
                    ? CUSTOMER_TYPE_ACCENTS[customerType]
                    : "border-zinc-100 bg-zinc-50/80 hover:border-zinc-200 hover:bg-zinc-50",
              ].join(" ")}
            >
              {/* Top row: icon + count badge */}
              <div className="flex items-center justify-between gap-2">
                <div
                  className={[
                    "rounded-md p-1.5",
                    active
                      ? "bg-[#2d6e1e]/10 text-[#2d6e1e]"
                      : hasItems
                        ? CUSTOMER_TYPE_ICON_BG[customerType]
                        : "bg-zinc-100 text-zinc-300",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {hasItems ? (
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                      active ? "bg-[#2d6e1e]/10 text-[#2d6e1e]" : CUSTOMER_TYPE_BADGES[customerType],
                    ].join(" ")}
                  >
                    {count}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-zinc-300">—</span>
                )}
              </div>

              {/* Type name */}
              <p
                className={[
                  "mt-2.5 text-sm font-semibold leading-tight",
                  active ? "text-[#2d6e1e]" : hasItems ? "text-zinc-900" : "text-zinc-400",
                ].join(" ")}
              >
                {CUSTOMER_TYPE_LABELS[customerType]}
              </p>

              {/* Description */}
              <p
                className={[
                  "mt-0.5 line-clamp-1 text-[11px]",
                  hasItems ? "text-zinc-500" : "text-zinc-300",
                ].join(" ")}
              >
                {CUSTOMER_TYPE_DESCRIPTIONS[customerType]}
              </p>

              {/* Bottom CTA */}
              <div
                className={[
                  "mt-3 flex items-center gap-0.5 text-xs font-medium",
                  active
                    ? "text-[#2d6e1e]"
                    : hasItems
                      ? CUSTOMER_TYPE_CTA[customerType]
                      : "text-zinc-300",
                ].join(" ")}
              >
                {hasItems ? (
                  <>
                    <span>{count === 1 ? "1 submission" : `${count} submissions`}</span>
                    <ChevronRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </>
                ) : (
                  <span>Nothing here</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
