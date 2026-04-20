import { CisCard } from "@/components/cis-card";
import type { CisStatus } from "@/components/status-badge";

type GridSubmission = {
  id: string;
  tradeName: string | null;
  contactPerson: string | null;
  customerType?: string | null;
  agentCode: string;
  agentName?: string | null;
  status: CisStatus;
  createdAt: Date;
  updatedAt?: Date | null;
};

interface CisCardGridProps {
  submissions: GridSubmission[];
  hrefPrefix: string;
  readOnlyView?: boolean;
}

export function CisCardGrid({ submissions, hrefPrefix, readOnlyView = false }: CisCardGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {submissions.map((s) => (
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
          href={`/${hrefPrefix}/${s.id}${readOnlyView ? "?view=all" : ""}`}
        />
      ))}
    </div>
  );
}
