"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocUploadSlot } from "@/components/doc-upload-slot";
import { SCORING_DOC_SLOTS, type FileEntry } from "@/lib/doc-types";

const OTHER_SLOT = { key: "docOther", label: "Other Supporting Documents" } as const;

export function CusDocSection({
  cusId,
  initialDocs,
  disabled = false,
}: {
  cusId: string;
  initialDocs: Record<string, FileEntry[]>;
  disabled?: boolean;
}) {
  const [docs, setDocs] = useState<Record<string, FileEntry[]>>(initialDocs);
  const router = useRouter();
  const endpoint = `/api/cus/${cusId}/docs`;

  function setDocFiles(key: string, files: FileEntry[]) {
    setDocs((prev) => ({ ...prev, [key]: files }));
    router.refresh();
  }

  const allSlots = [...SCORING_DOC_SLOTS, OTHER_SLOT];

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Upload updated supporting documents for this Customer Update Sheet. Files are
        appended and cannot be removed once uploaded.
      </p>
      <div className="space-y-4">
        {allSlots.map((slot) => (
          <DocUploadSlot
            key={slot.key}
            docType={slot.key as any}
            label={slot.label}
            endpoint={endpoint}
            files={docs[slot.key] ?? []}
            onChange={(files) => setDocFiles(slot.key, files)}
            disabled={disabled}
            allowDelete={false}
          />
        ))}
      </div>
    </div>
  );
}
