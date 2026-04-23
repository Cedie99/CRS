"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocUploadSlot } from "@/components/doc-upload-slot";
import { DOC_SLOTS, type DocType, type FileEntry } from "@/lib/doc-types";

export function AgentDocSection({
  cisId,
  initialDocs,
  disabled = false,
}: {
  cisId: string;
  initialDocs: Record<DocType, FileEntry[]>;
  disabled?: boolean;
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
        {DOC_SLOTS.map((slot) => (
          <DocUploadSlot
            key={slot.key}
            docType={slot.key}
            label={slot.label}
            endpoint={endpoint}
            files={docs[slot.key] ?? []}
            onChange={(files) => setDocFiles(slot.key, files)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
