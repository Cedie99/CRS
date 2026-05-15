"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import { CisInfoCard } from "@/components/cis-info-card";
import type { DocType, DocReviewStatus, DocReviewStatuses } from "@/lib/doc-types";

type CisInfoCardProps = React.ComponentProps<typeof CisInfoCard>;

interface DocReviewPanelProps extends CisInfoCardProps {
  initialDocReviewStatuses: DocReviewStatuses;
  canAct: boolean;
  onStatusesChange?: (statuses: DocReviewStatuses) => void;
  onMetricSave?: CisInfoCardProps["onMetricSave"];
}

export function DocReviewPanel({
  initialDocReviewStatuses,
  canAct,
  onStatusesChange,
  onMetricSave,
  ...cisInfoCardProps
}: DocReviewPanelProps) {
  const [docReviewStatuses, setDocReviewStatuses] = useState<DocReviewStatuses>(initialDocReviewStatuses);

  async function handleDocReview(docType: DocType, status: DocReviewStatus, reason?: string | null) {
    const res = await fetch(`/api/cis/${cisInfoCardProps.cisId}/doc-review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docType, status, reason: reason ?? null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Failed to save document review");
      return;
    }
    const data = await res.json();
    setDocReviewStatuses(data.docReviewStatuses);
    onStatusesChange?.(data.docReviewStatuses);
  }

  return (
    <CisInfoCard
      {...cisInfoCardProps}
      docReviewStatuses={docReviewStatuses}
      onDocReview={canAct ? handleDocReview : undefined}
      onMetricSave={canAct ? onMetricSave : undefined}
      metricPoints={(cisInfoCardProps as any).metricPoints}
    />
  );
}
