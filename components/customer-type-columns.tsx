import { CisCard } from "@/components/cis-card";
import type { CisStatus } from "@/components/status-badge";
import {
  DASHBOARD_CUSTOMER_TYPES,
  CUSTOMER_TYPE_BADGE_CLASSES,
  CUSTOMER_TYPE_LABELS,
  normalizeDashboardCustomerType,
  type DashboardCustomerType,
} from "@/lib/customer-types";

const CUSTOMER_TYPE_COLUMNS = DASHBOARD_CUSTOMER_TYPES.map((key) => ({
  key,
  label: CUSTOMER_TYPE_LABELS[key],
  badgeClassName: CUSTOMER_TYPE_BADGE_CLASSES[key],
}));

type CustomerTypeKey = DashboardCustomerType;

const CUSTOMER_TYPE_ORDER: Record<CustomerTypeKey, number> = {
  dealer: 0,
  distributor: 1,
  private_label: 2,
  toll_blend: 3,
  end_user: 4,
};

type CardSubmission = {
  id: string;
  tradeName: string | null;
  contactPerson: string | null;
  customerType?: string | null;
  agentCode: string;
  agentName?: string | null;
  customerCode?: string | null;
  status: CisStatus;
  createdAt: Date;
  updatedAt?: Date | null;
};

interface CustomerTypeColumnsProps {
  submissions: CardSubmission[];
  hrefPrefix: string;
}

function toCustomerTypeKey(customerType?: string | null): CustomerTypeKey {
  return normalizeDashboardCustomerType(customerType);
}

export function sortByCustomerType<T extends { customerType?: string | null }>(submissions: T[]): T[] {
  return [...submissions].sort(
    (a, b) =>
      CUSTOMER_TYPE_ORDER[toCustomerTypeKey(a.customerType)] -
      CUSTOMER_TYPE_ORDER[toCustomerTypeKey(b.customerType)]
  );
}

export function CustomerTypeColumns({ submissions, hrefPrefix }: CustomerTypeColumnsProps) {
  const sorted = sortByCustomerType(submissions);
  const grouped: Record<CustomerTypeKey, CardSubmission[]> = {
    dealer: [],
    distributor: [],
    private_label: [],
    toll_blend: [],
    end_user: [],
  };

  for (const submission of sorted) {
    grouped[toCustomerTypeKey(submission.customerType)].push(submission);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-start xl:grid-cols-5">
      {CUSTOMER_TYPE_COLUMNS.map((column) => {
        const items = grouped[column.key];
        return (
          <section
            key={column.key}
            className="flex min-h-52 flex-col rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 md:min-h-72"
          >
            <div className="mb-3 flex items-center justify-between border-b border-zinc-200/70 pb-2">
              <h3 className="text-sm font-semibold text-zinc-800">{column.label}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${column.badgeClassName}`}>
                {items.length}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white px-3 py-6 text-center text-xs text-zinc-400">
                No submissions
              </div>
            ) : (
              <div className="space-y-3 md:max-h-[70vh] md:overflow-y-auto md:pr-1">
                {items.map((s) => (
                  <CisCard
                    key={s.id}
                    id={s.id}
                    tradeName={s.tradeName}
                    contactPerson={s.contactPerson}
                    customerType={s.customerType}
                    agentCode={s.agentCode}
                    agentName={s.agentName ?? undefined}
                    customerCode={s.customerCode ?? undefined}
                    status={s.status}
                    createdAt={s.createdAt}
                    updatedAt={s.updatedAt ?? undefined}
                    href={`/${hrefPrefix}/${s.id}`}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}