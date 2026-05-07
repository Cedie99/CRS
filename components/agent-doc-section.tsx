"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocUploadSlot } from "@/components/doc-upload-slot";
import { SCORING_DOC_SLOTS, DOC_SLOTS, type DocType, type FileEntry, type DocReviewStatuses } from "@/lib/doc-types";

export function AgentDocSection({
  cisId,
  initialDocs,
  disabled = false,
  docReviewStatuses = {},
  rejectionTimestamp,
}: {
  cisId: string;
  initialDocs: Record<DocType, FileEntry[]>;
  disabled?: boolean;
  docReviewStatuses?: DocReviewStatuses;
  rejectionTimestamp?: Date | null;
}) {
  const [docs, setDocs] = useState<Record<DocType, FileEntry[]>>(initialDocs);
  const endpoint = `/api/cis/${cisId}/docs`;
  const router = useRouter();

  function setDocFiles(key: DocType, files: FileEntry[]) {
    setDocs((prev) => ({ ...prev, [key]: files }));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Upload supporting files on behalf of the customer. Existing files remain available for printing and review.
      </p>
      <div className="space-y-4">
        {[
          ...SCORING_DOC_SLOTS,
          // Agent-only extra requirements slot (not scored, but agent can attach misc docs)
          ...DOC_SLOTS.filter((s) => s.key === "docAgentOtherRequirements"),
        ].map((slot) => {
          const review = docReviewStatuses[slot.key];
          const isRejected = review?.status === "rejected";

          // Split files: those uploaded before the rejection are the rejected files;
          // those uploaded after are new replacements the agent has added.
          // Use per-doc rejectedAt if available so that replacements from a previous
          // round are not misclassified when the form is returned again for a different doc.
          const cutoff = isRejected && review?.rejectedAt
            ? Date.parse(review.rejectedAt)
            : (rejectionTimestamp ? rejectionTimestamp.getTime() : null);
          const allFiles = docs[slot.key] ?? [];
          const rejectedFiles = isRejected && cutoff !== null
            ? allFiles.filter((f) => !f.uploadedAt || Date.parse(f.uploadedAt) <= cutoff)
            : [];
          const newFiles = isRejected && cutoff !== null
            ? allFiles.filter((f) => f.uploadedAt && Date.parse(f.uploadedAt) > cutoff)
            : allFiles;

          return (
            <div
              key={slot.key}
              id={`doc-upload-${slot.key}`}
              className={
                isRejected
                  ? newFiles.length > 0
                    ? "rounded-lg border-2 border-green-400 bg-green-50/40 p-3"
                    : "doc-reject-border-shine rounded-lg border border-red-200 bg-red-50/40 p-3"
                  : undefined
              }
            >
              {isRejected && newFiles.length === 0 && (
                <div className="mb-2.5 flex items-center gap-2 rounded-md border border-red-100 bg-white px-3 py-1.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">!</span>
                  <div>
                    <p className="text-xs font-medium text-red-700">Replace this document</p>
                    {review?.reason && (
                      <p className="text-[11px] text-zinc-500">{review.reason}</p>
                    )}
                  </div>
                </div>
              )}

              {/* New replacement files + upload buttons — always on top */}
              <DocUploadSlot
                docType={slot.key}
                label={rejectedFiles.length > 0 ? "Upload replacement" : slot.label}
                endpoint={endpoint}
                files={newFiles}
                onChange={(files) => setDocFiles(slot.key, [...rejectedFiles, ...files])}
                disabled={disabled}
                reviewStatus={newFiles.length > 0 ? undefined : (isRejected ? undefined : review?.status)}
              />

              {/* Rejected files — shown below the replacement, dimmed once replaced */}
              {rejectedFiles.length > 0 && (
                <div className={`mt-2 transition-opacity duration-300${newFiles.length > 0 ? " opacity-35 grayscale" : ""}`}>
                  <DocUploadSlot
                    docType={slot.key}
                    label={slot.label}
                    endpoint={endpoint}
                    files={rejectedFiles}
                    onChange={() => {}}
                    disabled
                    allowRename={false}
                    allowDelete={false}
                    reviewStatus="rejected"
                    hideUploadButtons
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
