"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Upload, RotateCcw } from "lucide-react";
import { sileo as toast } from "sileo";
import { DocUploadSlot } from "@/components/doc-upload-slot";
import type { FileEntry } from "@/lib/doc-types";

interface RequiredSlot {
  key: string;
  label: string;
  files: FileEntry[];
}

export function CtrAgentActions({
  ctrId,
  status,
  cisId,
  requiredSlotsDisplay,
  requiredDocsNote,
  docsRequestedNote,
}: {
  ctrId: string;
  status: string;
  cisId: string;
  requiredSlotsDisplay: RequiredSlot[];
  requiredDocsNote: string | null;
  docsRequestedNote: string | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [docSlots, setDocSlots] = useState<Record<string, FileEntry[]>>(
    Object.fromEntries(requiredSlotsDisplay.map((s) => [s.key, s.files]))
  );

  const isDraft = status === "draft";
  const isPendingDocs = status === "pending_documents";

  const hasAtLeastOneUploaded = requiredSlotsDisplay.some(
    (s) => (docSlots[s.key]?.length ?? 0) > 0
  );

  function handleDocChange(key: string, files: FileEntry[]) {
    setDocSlots((prev) => ({ ...prev, [key]: files }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ctr/${ctrId}/submit`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      toast.success({ title: "CTR submitted for review." });
      router.refresh();
    } catch (err) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to submit." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResubmit() {
    if (!hasAtLeastOneUploaded && requiredSlotsDisplay.length > 0) {
      toast.error({ title: "Upload at least one required document first." });
      return;
    }
    setResubmitting(true);
    try {
      const res = await fetch(`/api/ctr/${ctrId}/agent-resubmit`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      toast.success({ title: "Resubmitted for review." });
      router.refresh();
    } catch (err) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to resubmit." });
    } finally {
      setResubmitting(false);
    }
  }

  if (isDraft) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Send className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-zinc-800">Ready to submit?</p>
            <p className="text-sm text-zinc-500 mt-0.5">
              Submit this reclassification request for review.
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
            : "Submit for Review"}
        </Button>
      </div>
    );
  }

  if (isPendingDocs) {
    return (
      <div className="rounded-xl border border-orange-200 bg-white overflow-hidden">
        <div className="border-b border-orange-100 bg-orange-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-orange-600" />
            <h2 className="text-sm font-semibold text-orange-800">Upload Required Documents</h2>
          </div>
          {docsRequestedNote && (
            <p className="text-xs text-orange-700 mt-1">{docsRequestedNote}</p>
          )}
        </div>
        <div className="p-4 space-y-3">
          {requiredSlotsDisplay.map((slot) => (
            <div key={slot.key}>
              <p className="text-xs font-semibold text-zinc-600 mb-1.5">{slot.label}</p>
              <DocUploadSlot
                docType={slot.key as never}
                label=""
                endpoint={`/api/ctr/${ctrId}/docs`}
                files={docSlots[slot.key] ?? []}
                onChange={(files) => handleDocChange(slot.key, files)}
                disabled={false}
                allowDelete={false}
                allowRename={false}
              />
            </div>
          ))}

          <Button
            onClick={handleResubmit}
            disabled={resubmitting || (!hasAtLeastOneUploaded && requiredSlotsDisplay.length > 0)}
            className="w-full gap-1.5 mt-2"
          >
            {resubmitting
              ? <><Loader2 className="h-4 w-4 animate-spin" />Resubmitting...</>
              : <><RotateCcw className="h-4 w-4" />Resubmit for Review</>}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
