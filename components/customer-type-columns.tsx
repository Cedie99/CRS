import { CisCard } from "@/components/cis-card";
import type { CisStatus } from "@/components/status-badge";

const CUSTOMER_TYPE_COLUMNS = [
  { key: "standard", label: "Standard", badgeClassName: "bg-zinc-100 text-zinc-700" },
  { key: "fs_petroleum", label: "FS Petroleum", badgeClassName: "bg-purple-100 text-purple-700" },
  { key: "special", label: "Special", badgeClassName: "bg-amber-100 text-amber-700" },
] as const;

type CustomerTypeKey = (typeof CUSTOMER_TYPE_COLUMNS)[number]["key"];

const CUSTOMER_TYPE_ORDER: Record<CustomerTypeKey, number> = {
  standard: 0,
  fs_petroleum: 1,
  special: 2,
};

type CardSubmission = {
  id: string;
  tradeName: string | null;
  contactPerson: string | null;
  customerType: string;
  agentCode: string;
  agentName?: string | null;
  status: CisStatus;
  createdAt: Date;
  updatedAt?: Date | null;
};

interface CustomerTypeColumnsProps {
  submissions: CardSubmission[];
  hrefPrefix: string;
}

function toCustomerTypeKey(customerType: string): CustomerTypeKey {
  if (customerType === "fs_petroleum" || customerType === "special") {
    return customerType;
  }
  return "standard";
}

export function sortByCustomerType<T extends { customerType: string }>(submissions: T[]): T[] {
  return [...submissions].sort(
    (a, b) =>
      CUSTOMER_TYPE_ORDER[toCustomerTypeKey(a.customerType)] -
      CUSTOMER_TYPE_ORDER[toCustomerTypeKey(b.customerType)]
  );
}

export function CustomerTypeColumns({ submissions, hrefPrefix }: CustomerTypeColumnsProps) {
  const sorted = sortByCustomerType(submissions);
  const grouped: Record<CustomerTypeKey, CardSubmission[]> = {
    standard: [],
    fs_petroleum: [],
    special: [],
  };

  for (const submission of sorted) {
    grouped[toCustomerTypeKey(submission.customerType)].push(submission);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
      {CUSTOMER_TYPE_COLUMNS.map((column) => {
        const items = grouped[column.key];
        return (
          <section key={column.key} className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">{column.label}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${column.badgeClassName}`}>
                {items.length}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-3 py-6 text-center text-xs text-zinc-400">
                No submissions
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((s) => (
                  <CisCard
                    key={s.id}
                    id={s.id}
                    tradeName={s.tradeName}
                    contactPerson={s.contactPerson}
                    customerType={s.customerType}
                    agentCode={s.agentCode}
                    agentName={s.agentName ?? undefined}
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